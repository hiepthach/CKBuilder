/**
 * @fileoverview xUDT Token utility functions for minting, balance queries, and transfers.
 * Integrates `@ckb-ccc/udt` and CCC SDK core primitives (`KnownScript.XUdt`, `numLeToBytes`, `udtBalanceFrom`)
 * to interact with xUDT fungible tokens on CKB Testnet.
 *
 * References:
 * - `@ckb-ccc/udt` package: https://docs.ckbccc.com/en/docs/packages/protocol-sdks/udt
 * - xUDT RFC: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0052-extensible-udt/0052-extensible-udt.md
 * - Token Standards: https://docs.nervos.org/docs/assets-token-standards/assets-overview
 */

import * as ccc from "@ckb-ccc/core";
import { Udt } from "@ckb-ccc/udt";

/** Default token symbol displayed in the UI */
export const TOKEN_SYMBOL = "MYTKN";

/** Default amount of tokens dispensed per faucet claim */
export const FAUCET_AMOUNT = BigInt(500);

/**
 * Minimum CKB capacity required for a cell that holds xUDT data.
 * A UDT cell needs: 8 (capacity) + 32 (lock code_hash) + 1 (lock hash_type) +
 * variable (lock args) + 32 (type code_hash) + 1 (type hash_type) + variable (type args)
 * + 16 (UDT data) bytes. Typically ~142 CKB for a standard secp256k1 lock.
 */
export const MIN_UDT_CAPACITY_CKB = "142";

// ---------------------------------------------------------------------------
// Encoding / Decoding helpers (using CCC built-ins)
// ---------------------------------------------------------------------------

/**
 * Encode a BigInt token amount into 16-byte uint128 little-endian hex string.
 * Uses `ccc.numLeToBytes` from `@ckb-ccc/core`.
 *
 * @param amount - Token amount as BigInt (must be non-negative, fits in uint128)
 * @returns Hex-encoded string prefixed with "0x" (34 chars total)
 */
export function encodeUdtAmount(amount: bigint): string {
  // 1. Validate range
  if (amount < 0n) {
    throw new Error("Token amount cannot be negative");
  }
  if (amount >= 2n ** 128n) {
    throw new Error("Token amount exceeds uint128 max value");
  }

  // 2. Convert to 16-byte little-endian hex via CCC helper
  return ccc.hexFrom(ccc.numLeToBytes(amount, 16));
}

/**
 * Decode a hex-encoded uint128 little-endian value from cell output data
 * back into a BigInt token amount using `ccc.udtBalanceFrom`.
 *
 * @param hexData - Hex string or Bytes from outputData
 * @returns Token amount as BigInt
 */
export function decodeUdtAmount(hexData: ccc.HexLike): bigint {
  // 1. Use CCC built-in udtBalanceFrom helper to parse 16-byte uint128 LE
  return ccc.udtBalanceFrom(hexData);
}

// ---------------------------------------------------------------------------
// `@ckb-ccc/udt` helper factory
// ---------------------------------------------------------------------------

/**
 * Instantiate a `@ckb-ccc/udt` SDK instance for high-level token operations.
 *
 * @param xudtTypeScript - The xUDT Type Script identifying this token
 * @returns An instance of the `Udt` class from `@ckb-ccc/udt`
 */
export function createUdtInstance(
  xudtTypeScript: ccc.Script,
  codeOutPoint?: ccc.OutPointLike
): Udt {
  const defaultOutPoint: ccc.OutPointLike = codeOutPoint ?? {
    txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    index: 0,
  };
  return new Udt(defaultOutPoint, xudtTypeScript);
}

// ---------------------------------------------------------------------------
// xUDT Type Script construction
// ---------------------------------------------------------------------------

/**
 * Build the xUDT Type Script for a given issuer lock script.
 * The xUDT standard uses the issuer's lock script hash as the Type Script `args`,
 * which determines who is authorized to mint new tokens.
 *
 * @param client - CCC client connected to a CKB network
 * @param issuerLockScript - The lock script of the token issuer
 * @returns Fully constructed xUDT Type Script
 */
export async function buildXudtTypeScript(
  client: ccc.Client,
  issuerLockScript: ccc.Script
): Promise<ccc.Script> {
  // 1. Compute the Blake2b-256 hash of the issuer's lock script
  const lockHash = issuerLockScript.hash();

  // 2. Resolve the xUDT known script with the lock hash as args
  const xudtType = await ccc.Script.fromKnownScript(
    client,
    ccc.KnownScript.XUdt,
    lockHash
  );

  return xudtType;
}

// ---------------------------------------------------------------------------
// Balance query
// ---------------------------------------------------------------------------

/**
 * Query the total xUDT token balance for a given address and token type.
 * Iterates through all live cells matching the user's lock script and the
 * xUDT type script, summing the uint128 amounts from each cell's output data.
 *
 * @param client - CCC client connected to a CKB network
 * @param lockScript - The user's lock script to query cells for
 * @param xudtTypeScript - The xUDT Type Script identifying the specific token
 * @returns Object containing total balance and count of UDT cells
 */
export async function getUdtBalance(
  client: ccc.Client,
  lockScript: ccc.Script,
  xudtTypeScript: ccc.Script
): Promise<{ balance: bigint; cellCount: number }> {
  let totalBalance = 0n;
  let cellCount = 0;

  // 1. Iterate all live cells matching this lock + type script pair
  for await (const cell of client.findCells({
    script: lockScript,
    scriptType: "lock",
    scriptSearchMode: "exact",
    filter: {
      script: xudtTypeScript,
    },
  })) {
    // 2. Decode the uint128 token amount from cell output data using ccc.udtBalanceFrom
    if (cell.outputData && cell.outputData.length >= 34) {
      const amount = ccc.udtBalanceFrom(cell.outputData);
      totalBalance += amount;
      cellCount++;
    }
  }

  return { balance: totalBalance, cellCount };
}

// ---------------------------------------------------------------------------
// Mint xUDT tokens (Faucet)
// ---------------------------------------------------------------------------

/**
 * Mint xUDT tokens to the connected wallet using `@ckb-ccc/udt` / CCC SDK.
 * The signer's own lock script hash is used as the xUDT issuer args,
 * which authorizes the mint operation.
 *
 * @param signer - CCC Signer from the connected wallet
 * @param amount - Number of tokens to mint (default: FAUCET_AMOUNT)
 * @returns Transaction hash of the broadcast mint transaction
 */
export async function mintXudt(
  signer: ccc.Signer,
  amount: bigint = FAUCET_AMOUNT
): Promise<string> {
  const client = signer.client;

  // 1. Get the signer's recommended lock script (used as both issuer and recipient)
  const { script: signerLock } = await signer.getRecommendedAddressObj();

  // 2. Build the xUDT Type Script using signer's lock hash as issuer args
  const xudtType = await buildXudtTypeScript(client, signerLock);

  // 3. Encode the token amount as uint128 little-endian hex via CCC
  const encodedAmount = ccc.hexFrom(ccc.numLeToBytes(amount, 16));

  // 4. Construct the mint transaction with one output cell containing the tokens
  const tx = ccc.Transaction.from({
    outputs: [
      {
        lock: signerLock,
        type: xudtType,
      },
    ],
    outputsData: [encodedAmount],
  });

  // 5. Add xUDT cell dependency
  await tx.addCellDepsOfKnownScripts(client, ccc.KnownScript.XUdt);

  // 6. Automatically gather CKB input cells to cover capacity requirements
  await tx.completeInputsByCapacity(signer);

  // 7. Calculate transaction fee and create change output
  await tx.completeFeeBy(signer, 1000);

  // 8. Sign and broadcast the transaction
  const txHash = await signer.sendTransaction(tx);
  return txHash;
}

// ---------------------------------------------------------------------------
// Transfer xUDT tokens
// ---------------------------------------------------------------------------

/**
 * Transfer xUDT tokens from the connected wallet to a recipient address.
 * Manually gathers sender's UDT cells as inputs and creates a change UDT cell
 * for any excess tokens.
 *
 * @param signer - CCC Signer from the connected wallet
 * @param xudtTypeScript - The xUDT Type Script identifying the token to transfer
 * @param toAddressStr - Recipient's CKB address string (Bech32m)
 * @param amount - Number of tokens to transfer
 * @returns Transaction hash of the broadcast transfer transaction
 */
export async function transferXudt(
  signer: ccc.Signer,
  xudtTypeScript: ccc.Script,
  toAddressStr: string,
  amount: bigint
): Promise<string> {
  const client = signer.client;

  // 1. Resolve the recipient address to a lock script
  const toAddr = await ccc.Address.fromString(toAddressStr, client);

  // 2. Get the sender's lock script
  const { script: senderLock } = await signer.getRecommendedAddressObj();

  // 3. Encode the transfer amount as uint128 LE
  const encodedAmount = ccc.hexFrom(ccc.numLeToBytes(amount, 16));

  // 4. Collect sender's UDT cells until we have enough tokens
  let collectedAmount = 0n;
  const collectedCells: ccc.Cell[] = [];
  for await (const cell of client.findCells({
    script: senderLock,
    scriptType: "lock",
    scriptSearchMode: "exact",
    filter: {
      script: xudtTypeScript,
    },
  })) {
    if (cell.outputData && cell.outputData.length >= 34) {
      const cellAmount = ccc.udtBalanceFrom(cell.outputData);
      collectedAmount += cellAmount;
      collectedCells.push(cell);

      if (collectedAmount >= amount) break;
    }
  }

  // 5. Verify sufficient token balance
  if (collectedAmount < amount) {
    throw new Error(
      `Insufficient token balance. Have ${collectedAmount}, need ${amount}`
    );
  }

  // 6. Build transaction outputs: recipient cell + optional change cell
  const outputs: ccc.CellOutputLike[] = [
    {
      lock: toAddr.script,
      type: xudtTypeScript,
    },
  ];
  const outputsData: string[] = [encodedAmount];

  // 7. If there is excess token amount, create a change UDT cell back to sender
  const changeAmount = collectedAmount - amount;
  if (changeAmount > 0n) {
    outputs.push({
      lock: senderLock,
      type: xudtTypeScript,
    });
    outputsData.push(ccc.hexFrom(ccc.numLeToBytes(changeAmount, 16)));
  }

  // 8. Construct the transaction with collected UDT cells as inputs
  const tx = ccc.Transaction.from({
    outputs,
    outputsData,
  });

  // 9. Add xUDT cell dependency
  await tx.addCellDepsOfKnownScripts(client, ccc.KnownScript.XUdt);

  // 10. Add the collected UDT cells as explicit inputs
  for (const cell of collectedCells) {
    tx.inputs.push(
      ccc.CellInput.from({
        previousOutput: cell.outPoint,
      })
    );
  }

  // 11. Gather additional CKB inputs to cover capacity for new output cells
  await tx.completeInputsByCapacity(signer);

  // 12. Calculate and apply transaction fee
  await tx.completeFeeBy(signer, 1000);

  // 13. Sign and broadcast
  const txHash = await signer.sendTransaction(tx);
  return txHash;
}
