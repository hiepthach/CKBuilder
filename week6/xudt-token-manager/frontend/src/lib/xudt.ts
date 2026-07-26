/**
 * @fileoverview xUDT Token utility functions for minting, balance queries, and transfers.
 * Uses CCC SDK core primitives (KnownScript.XUdt, findCells, numLeToBytes) to interact
 * with xUDT fungible tokens on CKB Testnet.
 *
 * References:
 * - xUDT RFC: https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0052-extensible-udt/0052-extensible-udt.md
 * - CCC SDK Docs: https://docs.ckbccc.com/en/docs/packages/protocol-sdks/udt
 * - Token Standards: https://docs.nervos.org/docs/assets-token-standards/assets-overview
 */

import * as ccc from "@ckb-ccc/core";

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
// Encoding / Decoding helpers
// ---------------------------------------------------------------------------

/**
 * Encode a BigInt token amount into 16-byte uint128 little-endian hex string.
 * This is the on-chain storage format for xUDT / sUDT output data.
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

  // 2. Convert to 16-byte little-endian buffer
  const buf = new Uint8Array(16);
  let remaining = amount;
  for (let i = 0; i < 16; i++) {
    buf[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  // 3. Convert buffer to hex string
  const hexChars = Array.from(buf, (b) => b.toString(16).padStart(2, "0"));
  return "0x" + hexChars.join("");
}

/**
 * Decode a hex-encoded uint128 little-endian value from cell output data
 * back into a BigInt token amount.
 *
 * @param hexData - Hex string from outputData (at least 16 bytes / 32 hex chars after "0x")
 * @returns Token amount as BigInt
 */
export function decodeUdtAmount(hexData: string): bigint {
  // 1. Strip "0x" prefix if present
  const hex = hexData.startsWith("0x") ? hexData.slice(2) : hexData;

  // 2. Take first 32 hex chars (16 bytes for uint128)
  const tokenHex = hex.slice(0, 32);
  if (tokenHex.length < 32) {
    throw new Error(
      `Invalid UDT data: expected at least 16 bytes, got ${tokenHex.length / 2}`
    );
  }

  // 3. Parse as little-endian uint128
  let result = 0n;
  for (let i = 0; i < 16; i++) {
    const byte = parseInt(tokenHex.slice(i * 2, i * 2 + 2), 16);
    result += BigInt(byte) << BigInt(i * 8);
  }

  return result;
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
    // 2. Decode the uint128 token amount from cell output data
    if (cell.outputData && cell.outputData.length >= 34) {
      // "0x" + 32 hex chars
      const amount = decodeUdtAmount(cell.outputData);
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
 * Mint xUDT tokens to the connected wallet. The signer's own lock script hash
 * is used as the xUDT issuer args, which authorizes the mint operation.
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

  // 3. Encode the token amount as uint128 little-endian hex
  const encodedAmount = encodeUdtAmount(amount);

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

  // 6. Calculate transaction fee and create change output
  await tx.completeFeeBy(signer, 1000);

  // 7. Sign and broadcast the transaction
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
  const encodedAmount = encodeUdtAmount(amount);

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
      const cellAmount = decodeUdtAmount(cell.outputData);
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
    outputsData.push(encodeUdtAmount(changeAmount));
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

  // 10. Gather additional CKB inputs to cover capacity for new output cells
  await tx.completeInputsByCapacity(signer);

  // 11. Calculate and apply transaction fee
  await tx.completeFeeBy(signer, 1000);

  // 12. Sign and broadcast
  const txHash = await signer.sendTransaction(tx);
  return txHash;
}
