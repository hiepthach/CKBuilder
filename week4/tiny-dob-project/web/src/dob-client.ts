/**
 * @file dob-client.ts
 * @description Client-side SDK module for the TinyDOB (tDOB) protocol.
 * This module manages DOB data serialization/deserialization and off-chain transaction
 * construction (Mint, Transfer, and Burn) using the Nervos CKB Common Chains Connector (CCC) SDK.
 * 
 * Architecture References & CKB Cell Model Mechanics:
 * 1. Cell Model: CKB represents state as UTXO-like "Cells". Each cell has lock script, type script,
 *    and output data. Ref: https://docs.nervos.org/docs/basics/concepts/cell-model
 * 2. Occupied Capacity: The minimum CKB capacity required to store cell components on-chain.
 *    Calculated as 8 bytes (capacity field) + lock size + type size + data size.
 *    Ref: https://docs.nervos.org/docs/basics/concepts/cell-model#occupied-capacity
 * 3. Unique ID Generation (DOB ID): A 32-byte Blake2b hash computed off-chain as:
 *    blake2b(first_input_outpoint + output_index)
 *    Ref: https://docs.nervos.org/docs/reference/cryptography#blake2b
 * 4. Indexer Querying: Locating live cells matching specific script properties.
 *    Ref: https://docs.nervos.org/docs/reference/indexer
 * 
 */

import { ccc } from "@ckb-ccc/core";

/**
 * Serializes DOB data using a 1-byte content type length prefix.
 * Layout:
 * [ 1 byte length of content_type ] [ content_type string bytes ] [ content binary bytes ]
 * 
 * Ref: CKB Molecule and custom binary layouts in smart contracts.
 */
export function serializeDobData(contentType: string, content: Uint8Array): Uint8Array {
  const contentTypeBytes = ccc.bytesFrom(contentType, "utf8");
  if (contentTypeBytes.length > 255) {
    throw new Error("Content type is too long (maximum 255 bytes)");
  }
  
  const serialized = new Uint8Array(1 + contentTypeBytes.length + content.length);
  serialized[0] = contentTypeBytes.length;
  serialized.set(contentTypeBytes, 1);
  serialized.set(content, 1 + contentTypeBytes.length);
  return serialized;
}

/**
 * Deserializes raw cell data bytes into DOB content type and content binary data.
 */
export function deserializeDobData(data: Uint8Array): { contentType: string; content: Uint8Array } {
  if (data.length === 0) {
    throw new Error("Empty cell data: cannot deserialize DOB data");
  }
  
  const contentTypeLen = data[0];
  if (1 + contentTypeLen > data.length) {
    throw new Error("Corrupted cell data: content type length prefix exceeds data bounds");
  }
  
  const contentType = ccc.bytesTo(data.slice(1, 1 + contentTypeLen), "utf8");
  const content = data.slice(1 + contentTypeLen);
  return { contentType, content };
}

/**
 * Builds and signs a DOB Minting transaction.
 * 
 * CKB Mechanics & Transaction Flow:
 * 1. Build a draft transaction with a dummy 32-byte DOB ID (dummy args).
 * 2. Invoke `completeInputsByCapacity` to gather enough inputs to cover the required CKB occupied capacity.
 * 3. Extract the first collected input's outpoint.
 * 4. Compute the actual DOB ID as `blake2b(first_input_outpoint + output_index)`.
 * 5. Update the output type script's args with the computed DOB ID.
 * 6. Balance the transaction fee and broadcast it.
 * 
 * Ref: Nervos CKB unique ID generation pattern / Hash Lock unique hash generation.
 */
export async function buildMintDobTx(
  signer: ccc.Signer,
  dobTypeScriptCodeHash: string,
  dobTypeScriptHashType: ccc.HashType,
  contractOutPoint: ccc.OutPointLike,
  contentType: string,
  content: Uint8Array
): Promise<string> {
  const signerAddress = (await signer.getAddressObjs())[0];
  
  // Create script with 32-byte dummy args
  const dummyArgs = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const dobTypeScript = ccc.Script.from({
    codeHash: dobTypeScriptCodeHash,
    hashType: dobTypeScriptHashType,
    args: dummyArgs,
  });
  
  const dobOutput = ccc.CellOutput.from({
    lock: signerAddress.script,
    type: dobTypeScript,
  });
  
  const serializedDobData = serializeDobData(contentType, content);
  
  // Occupied capacity calculation (each byte requires 1 CKB / 10^8 Shannons)
  // Ref: https://docs.nervos.org/docs/basics/concepts/cell-model#occupied-capacity
  dobOutput.capacity = ccc.fixedPointFrom(
    dobOutput.occupiedSize + serializedDobData.length
  );
  
  const tx = ccc.Transaction.from({
    outputs: [dobOutput],
    outputsData: [ccc.hexFrom(serializedDobData)],
    cellDeps: [
      ccc.CellDep.from({
        outPoint: contractOutPoint,
        depType: "code",
      }),
    ],
  });
  
  // Automatically select inputs from signer wallet to satisfy the occupied capacity
  await tx.completeInputsByCapacity(signer);
  
  if (tx.inputs.length === 0) {
    throw new Error("Signer wallet does not contain enough live cells to cover tDOB storage capacity.");
  }
  
  // Calculate unique DOB ID off-chain
  const firstInputOutPoint = tx.inputs[0].previousOutput;
  if (!firstInputOutPoint) {
    throw new Error("Invalid input outpoint during input resolution");
  }
  
  // Output index of the tDOB cell in outputs array (0 in this case)
  const outputIndex = 0;
  
  // Molecule OutPoint is serialized as txHash (32 bytes) + index (4 bytes, little-endian)
  // Combine it with output_index (8 bytes, little-endian)
  const dataToHash = ccc.bytesConcat(
    firstInputOutPoint.toBytes(),
    ccc.numLeToBytes(outputIndex, 8)
  );
  
  // Blake2b CKB Default Hash (hashCkb)
  const dobId = ccc.hashCkb(dataToHash);
  
  // Update draft output cell type script args with computed DOB ID
  tx.outputs[0].type!.args = dobId;
  
  // Deduct transaction fee and balance remaining capacity to signer's change cell
  await tx.completeFeeBy(signer);
  
  console.log("Transaction being sent:", tx);
  console.log("Inputs:", tx.inputs);
  console.log("CellDeps:", tx.cellDeps);
  
  // Broadcast transaction to network
  const txHash = await signer.sendTransaction(tx);
  return txHash;
}

/**
 * Builds and signs a DOB Transfer transaction.
 * 
 * CKB Mechanics & Transaction Flow:
 * 1. Query the Indexer to locate the live cell representing the tDOB using its Type Script.
 * 2. Add the live DOB cell as a transaction input.
 * 3. Create a corresponding output cell matching the original DOB ID and data, but owned by the recipient lock.
 * 4. Run `completeInputsByCapacity` to cover any additional fees if necessary.
 * 5. Sign and broadcast.
 */
export async function buildTransferDobTx(
  signer: ccc.Signer,
  dobTypeScriptCodeHash: string,
  dobTypeScriptHashType: ccc.HashType,
  contractOutPoint: ccc.OutPointLike,
  dobId: string,
  toAddress: string
): Promise<string> {
  const client = signer.client;
  
  // Unique Type Script matching our specific DOB ID
  const dobTypeScript = ccc.Script.from({
    codeHash: dobTypeScriptCodeHash,
    hashType: dobTypeScriptHashType,
    args: dobId,
  });
  
  // Locate the live cell using indexer generator
  let liveCell: ccc.Cell | undefined = undefined;
  for await (const cell of client.findCellsByType(dobTypeScript)) {
    liveCell = cell;
    break;
  }
  
  if (!liveCell) {
    throw new Error(`TinyDOB cell with ID ${dobId} was not found on-chain.`);
  }
  
  const toAddressObj = await ccc.Address.fromString(toAddress, client);
  const dobOutput = ccc.CellOutput.from({
    lock: toAddressObj.script,
    type: dobTypeScript,
    capacity: liveCell.cellOutput.capacity,
  });
  
  const tx = ccc.Transaction.from({
    inputs: [ccc.CellInput.from({ previousOutput: liveCell.outPoint })],
    outputs: [dobOutput],
    outputsData: [liveCell.outputData],
    cellDeps: [
      ccc.CellDep.from({
        outPoint: contractOutPoint,
        depType: "code",
      }),
    ],
  });
  
  // Balance capacities and sign
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer);
  
  const txHash = await signer.sendTransaction(tx);
  return txHash;
}

/**
 * Builds and signs a DOB Burning transaction.
 * 
 * CKB Mechanics & Transaction Flow:
 * 1. Query the Indexer to locate the live cell representing the tDOB.
 * 2. Add the live DOB cell as an input.
 * 3. Do NOT define a corresponding output cell. This melts/burns the cell on-chain.
 * 4. The occupied capacity originally locked in the DOB cell is refunded back to the signer's wallet.
 * 5. Sign and broadcast.
 */
export async function buildBurnDobTx(
  signer: ccc.Signer,
  dobTypeScriptCodeHash: string,
  dobTypeScriptHashType: ccc.HashType,
  contractOutPoint: ccc.OutPointLike,
  dobId: string
): Promise<string> {
  const client = signer.client;
  
  const dobTypeScript = ccc.Script.from({
    codeHash: dobTypeScriptCodeHash,
    hashType: dobTypeScriptHashType,
    args: dobId,
  });
  
  let liveCell: ccc.Cell | undefined = undefined;
  for await (const cell of client.findCellsByType(dobTypeScript)) {
    liveCell = cell;
    break;
  }
  
  if (!liveCell) {
    throw new Error(`TinyDOB cell with ID ${dobId} was not found on-chain.`);
  }
  
  // Consume input without producing output to melt the cell
  const tx = ccc.Transaction.from({
    inputs: [ccc.CellInput.from({ previousOutput: liveCell.outPoint })],
    cellDeps: [
      ccc.CellDep.from({
        outPoint: contractOutPoint,
        depType: "code",
      }),
    ],
  });
  
  // Capacity balance will automatically refund the tDOB capacity back to the signer
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer);
  
  const txHash = await signer.sendTransaction(tx);
  return txHash;
}
