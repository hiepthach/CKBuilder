import { ccc } from "@ckb-ccc/core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEVNET_SCRIPTS = {
  [ccc.KnownScript.Secp256k1Blake160]: {
    codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 0,
          },
          depType: "depGroup",
        },
      },
    ],
  },
  [ccc.KnownScript.Secp256k1Multisig]: {
    codeHash: "0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 1,
          },
          depType: "depGroup",
        },
      },
    ],
  },
  [ccc.KnownScript.AnyoneCanPay]: {
    codeHash: "0xe09352af0066f3162287763ce4ddba9af6bfaeab198dc7ab37f8c71c9e68bb5b",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 8,
          },
          depType: "code",
        },
      },
    ],
  },
  [ccc.KnownScript.OmniLock]: {
    codeHash: "0x9c6933d977360f115a3e9cd5a2e0e475853681b80d775d93ad0f8969da343e56",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 7,
          },
          depType: "code",
        },
      },
      {
        cellDep: {
          outPoint: {
            txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 0,
          },
          depType: "depGroup",
        },
      },
    ],
  },
  [ccc.KnownScript.XUdt]: {
    codeHash: "0x1a1e4fef34f5982906f745b048fe7b1089647e82346074e0f32c2ece26cf6b1e",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 6,
          },
          depType: "code",
        },
      },
    ],
  },
  [ccc.KnownScript.NervosDao]: {
    codeHash: "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 2,
          },
          depType: "code",
        },
      },
    ],
  },
};

// DOB helper functions from dob-client.ts
function serializeDobData(contentType, content) {
  const cTypeBytes = ccc.bytesFrom(contentType, "utf8");
  const header = ccc.bytesConcat(
    ccc.numLeToBytes(cTypeBytes.length, 4),
    cTypeBytes,
    ccc.numLeToBytes(content.length, 4)
  );
  return ccc.bytesConcat(header, content);
}

async function run() {
  const client = new ccc.ClientPublicTestnet({
    url: "http://127.0.0.1:28114",
    scripts: DEVNET_SCRIPTS,
  });
  const originalGetFeeRateStatistics = client.getFeeRateStatistics.bind(client);
  client.getFeeRateStatistics = async (blockRange) => {
    try {
      return await originalGetFeeRateStatistics(blockRange);
    } catch (err) {
      return { mean: ccc.numFrom(1000), median: ccc.numFrom(1000) };
    }
  };
  const privateKey = "0xf4a1fc19468b51ba9d1f0f5441fa3f4d91e625b2af105e1e37cc54bf9b19c0a1"; // Account 3
  const walletSigner = new ccc.SignerCkbPrivateKey(client, privateKey);
  const secp256k1AddrObj = await walletSigner.getAddressObjSecp256k1();
  console.log("Address:", secp256k1AddrObj.toString());

  const balance = await client.getBalanceSingle(secp256k1AddrObj.script);
  console.log("Balance:", ccc.fixedPointToString(balance));

  // Read contract configurations dynamically from scripts.json
  const scriptsJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../src/deployment/scripts.json"), "utf8")
  );
  const devnetContract = scriptsJson.devnet["tiny-dob-script"];

  if (!devnetContract) {
    throw new Error("Contract configuration not found in scripts.json! Please deploy first.");
  }

  const contractOutPoint = ccc.OutPoint.from({
    txHash: devnetContract.cellDeps[0].cellDep.outPoint.txHash,
    index: devnetContract.cellDeps[0].cellDep.outPoint.index,
  });

  const dobTypeScriptCodeHash = devnetContract.codeHash;
  const dobTypeScriptHashType = devnetContract.hashType;

  const dummyArgs = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const dobTypeScript = ccc.Script.from({
    codeHash: dobTypeScriptCodeHash,
    hashType: dobTypeScriptHashType,
    args: dummyArgs,
  });

  const dobOutput = ccc.CellOutput.from({
    lock: secp256k1AddrObj.script,
    type: dobTypeScript,
  });

  const fileData = fs.readFileSync(path.join(__dirname, "images(1).jpg"));
  const serializedDobData = serializeDobData("image/jpeg", fileData);
  dobOutput.capacity = ccc.fixedPointFrom(
    dobOutput.occupiedSize + serializedDobData.length
  );

  console.log("Creating transaction...");
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

  await tx.completeInputsByCapacity(walletSigner);

  // Calculate unique DOB ID
  const firstInputOutPoint = tx.inputs[0].previousOutput;
  const outputIndex = 0;
  const dataToHash = ccc.bytesConcat(
    firstInputOutPoint.toBytes(),
    ccc.numLeToBytes(outputIndex, 8)
  );
  const dobId = ccc.hashCkb(dataToHash);
  tx.outputs[0].type.args = dobId;

  await tx.completeFeeBy(walletSigner);

  console.log("Broadcasting transaction...");
  try {
    const txHash = await walletSigner.sendTransaction(tx);
    console.log("Success! Tx Hash:", txHash);
  } catch (err) {
    console.error("Failed to send transaction:", err);
  }
}

run();
