import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const artifactPath = path.join(rootDir, "artifacts", "contracts", "BugAuditTrail.sol", "BugAuditTrail.json");
const deploymentsDir = path.join(rootDir, "deployments");
const deploymentFile = path.join(deploymentsDir, "localhost.json");

async function main() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Compiled artifact not found. Run `npm run compile` first.");
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  const privateKey =
    process.env.BLOCKCHAIN_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const network = await provider.getNetwork();
  const deployment = {
    contractName: "BugAuditTrail",
    address: await contract.getAddress(),
    deployer: signer.address,
    chainId: Number(network.chainId),
    rpcUrl,
    deployedAt: new Date().toISOString(),
  };

  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2), "utf8");

  console.log("BugAuditTrail deployed successfully");
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
