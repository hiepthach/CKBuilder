const { ccc } = require("@ckb-ccc/core");
const fs = require("fs");

async function main() {
  const scriptsJson = JSON.parse(fs.readFileSync("./src/deployment/scripts.json", "utf8"));
  const client = new ccc.ClientPublicTestnet({
    url: "http://127.0.0.1:28114",
    scripts: scriptsJson.devnet,
  });
  
  // Patch fee rate just in case
  const originalGetFeeRateStatistics = client.getFeeRateStatistics.bind(client);
  client.getFeeRateStatistics = async (blockRange) => {
    try {
      return await originalGetFeeRateStatistics(blockRange);
    } catch (err) {
      return { mean: ccc.numFrom(1000), median: ccc.numFrom(1000) };
    }
  };

  const privateKey = "0xf4a1fc19468b51ba9d1f0f5441fa3f4d91e625b2af105e1e37cc54bf9b19c0a1"; // Account 3
  const signer = new ccc.SignerCkbPrivateKey(client, privateKey);
  const script = (await signer.getAddressObjSecp256k1()).script;
  
  console.log("Address:", (await signer.getAddressObjSecp256k1()).toString());
  const bal = await client.getBalanceSingle(script);
  console.log("Balance on Devnet:", ccc.fixedPointToString(bal));
}
main().catch(console.error);
