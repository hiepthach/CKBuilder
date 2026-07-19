/**
 * @fileoverview Off-chain Hash Lock Logic
 * 
 * This file contains the core logic for building and signing transactions using the CCC SDK.
 * It acts as the bridge between the React frontend and the CKB blockchain.
 * 
 * Concept Reference: https://docs.ckbccc.com/en/docs/concepts/transaction
 */

import { ccc } from "@ckb-ccc/core";
import scriptsData from "../deployment/scripts.json";

/**
 * Helper to get the correct config based on network.
 * Extracts `codeHash`, `hashType`, and `cellDeps` of the deployed script.
 * 
 * @param {boolean} isTestnet - True if Testnet, False if Devnet.
 * @returns {object} The hash-lock script configuration.
 */
export function getHashLockConfig(isTestnet: boolean) {
  const networkKey = isTestnet ? "testnet" : "devnet";
  const config = (scriptsData as any)[networkKey]?.["hash-lock"];
  
  if (!config) {
    throw new Error(`Hash Lock config not found for network: ${networkKey}. Have you deployed it?`);
  }
  
  return {
    codeHash: config.codeHash,
    hashType: config.hashType as ccc.HashType,
    cellDeps: config.cellDeps.map((dep: any) => ({
      outPoint: {
        txHash: dep.cellDep.outPoint.txHash,
        index: dep.cellDep.outPoint.index,
      },
      depType: dep.cellDep.depType as ccc.DepType,
    })),
  };
}

/**
 * Calculates the blake2b hash of the password exactly like CKB standard hasher.
 * 
 * Reference for Simple Lock architecture: https://docs.nervos.org/docs/dapp/simple-lock
 * 
 * @param {string} password - The plaintext password string.
 * @returns {string} The 32-byte hash string in hex format.
 */
export function hashPassword(password: string): string {
  // Convert string to bytes
  const pwdBytes = ccc.bytesFrom(password, "utf8");
  // CKB default blake2b hash personal is "ckb-default-hash"
  return ccc.hexFrom(ccc.hashCkb(pwdBytes));
}

/**
 * Builds a transaction to lock CKB with a password.
 * 
 * Following the compose transactions guide:
 * https://docs.ckbccc.com/en/docs/guides/compose-transactions
 * 
 * @param {ccc.Signer} signer - The connected CCC wallet signer.
 * @param {ccc.Num} amount - The amount of CKB (in shannons) to lock.
 * @param {string} password - The plaintext password. The hash will be stored in the lock args.
 * @param {boolean} isTestnet - Network flag.
 * @returns {Promise<ccc.Transaction>} The assembled transaction ready to be sent.
 */
export async function buildLockTx(
  signer: ccc.Signer,
  amount: ccc.Num,
  password: string,
  isTestnet: boolean
) {
  const config = getHashLockConfig(isTestnet);
  // 1. Calculate the password hash to use as script args.
  const pwdHash = hashPassword(password);

  // 2. Build the lock script for the new cell using our Hash Lock contract.
  const lockScript = ccc.Script.from({
    codeHash: config.codeHash,
    hashType: config.hashType,
    args: pwdHash,
  });

  // 3. Create a transaction builder
  const tx = ccc.Transaction.from({
    outputs: [{
      capacity: amount,
      lock: lockScript,
    }],
    // Output data must be empty for simple lock
    outputsData: ["0x"], 
  });

  // 4. Complete the transaction using the signer.
  // This will add inputs from the signer's wallet to cover the capacity and fee,
  // and will also add the change output.
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, 1000);

  return tx;
}

/**
 * Builds a transaction to unlock CKB previously locked with a password.
 * 
 * Demonstrates adding custom `CellDep` and setting `WitnessArgs.lock`.
 * Reference for Cell Dependencies: https://docs.ckbccc.com/en/docs/concepts/transaction#advanced-adding-cell-dependencies
 * 
 * @param {ccc.Signer} signer - The connected CCC wallet signer to receive the unlocked funds.
 * @param {ccc.Cell} cell - The locked cell to consume.
 * @param {string} password - The plaintext password to unlock the cell.
 * @param {boolean} isTestnet - Network flag.
 * @param {ccc.Num} [transferAmount] - Optional. If provided, transfers only this amount to the recipient and returns the rest to the signer. If empty, transfers the full amount.
 * @returns {Promise<ccc.Transaction>} The assembled transaction ready to be sent.
 */
export async function buildUnlockTx(
  signer: ccc.Signer,
  cell: ccc.Cell,
  password: string,
  isTestnet: boolean,
  recipientAddress?: string,
  transferAmount?: ccc.Num
) {
  const config = getHashLockConfig(isTestnet);
  // 1. Create a transaction builder
  const tx = ccc.Transaction.from({
    inputs: [{
      previousOutput: cell.outPoint,
      since: 0,
    }],
  });

  // 2. Add the preimage (plaintext password) to the witness.
  // The Hash Lock contract (in Rust) expects the preimage to be in WitnessArgs.lock
  const pwdBytes = ccc.bytesFrom(password, "utf8");
  const witnessArgs = ccc.WitnessArgs.from({
    lock: pwdBytes,
  });
  
  // Add witness to the same index as the input (index 0)
  tx.witnesses.push(ccc.hexFrom(witnessArgs.toBytes()));

  // 3. Add cell dep for the Hash Lock script.
  config.cellDeps.forEach((dep: any) => {
    tx.cellDeps.push(ccc.CellDep.from(dep));
  });

  // 4. Determine the target lock script for the output funds
  let targetLock: ccc.Script;
  if (recipientAddress && recipientAddress.trim() !== "") {
    // Parse the recipient address into a lock script
    const address = await ccc.Address.fromString(recipientAddress, signer.client);
    targetLock = address.script;
  } else {
    // Default to the signer's own address
    const addressObj = await signer.getRecommendedAddressObj();
    targetLock = addressObj.script;
  }
  
  // Calculate input capacity
  const inputCapacity = cell.cellOutput.capacity;
  
  if (transferAmount && transferAmount > 0n) {
    if (transferAmount > inputCapacity) {
      throw new Error(`Transfer amount exceeds locked capacity (${ccc.fixedPointToString(inputCapacity)} CKB)`);
    }
    
    // Output 1: Transfer amount to targetLock
    tx.addOutput({
      capacity: transferAmount,
      lock: targetLock,
    }, "0x");

    // Output 2: Change to signer (if any remainder)
    const changeAmount = inputCapacity - transferAmount;
    if (changeAmount > 0n) {
      const minCapacity = ccc.fixedPointFrom(61, 8);
      if (changeAmount >= minCapacity) {
        // KEEP THE REMAINDER LOCKED: use the same Hash Lock script
        const changeLock = cell.cellOutput.lock;
        tx.addOutput({
          capacity: changeAmount,
          lock: changeLock,
        }, "0x");
      } else {
        throw new Error(`Remaining capacity (${ccc.fixedPointToString(changeAmount)} CKB) is too small to create a change cell (minimum 61 CKB). Please transfer a different amount or the full amount.`);
      }
    }
  } else {
    // Original behavior: Transfer exact full amount
    tx.addOutput({
      capacity: inputCapacity,
      lock: targetLock,
    }, "0x");
  }

  // Since output capacity == input capacity, the transaction currently has 0 fee.
  // Calling completeFeeBy will automatically fetch an additional CKB cell from 
  // the signer's wallet to pay for the network fee.
  await tx.completeFeeBy(signer, 1000);

  return tx;
}
