import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const artifactPath = path.join(rootDir, "artifacts", "contracts", "BugAuditTrail.sol", "BugAuditTrail.json");
const deploymentPath = path.join(rootDir, "deployments", "localhost.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(artifactPath)) {
  fail("Contract artifact not found. Run `npm run compile` first.");
}

if (!fs.existsSync(deploymentPath)) {
  fail("Deployment file not found. Run `npm run deploy:local` first.");
}

const payloadFile = process.argv[2];
if (!payloadFile || !fs.existsSync(payloadFile)) {
  fail("Payload file not found.");
}

const payload = JSON.parse(fs.readFileSync(payloadFile, "utf8"));
for (const field of ["bugId", "action", "actorEmail", "actorRole"]) {
  if (!payload[field]) {
    fail(`Missing field: ${field}`);
  }
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
const privateKey =
  process.env.BLOCKCHAIN_PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const provider = new ethers.JsonRpcProvider(rpcUrl);
const signer = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(deployment.address, artifact.abi, signer);

const metadata = typeof payload.metadata === "string" ? payload.metadata : JSON.stringify(payload.metadata ?? {});

try {
  const tx = await contract.recordBugEvent(
    String(payload.bugId),
    String(payload.action),
    String(payload.actorEmail),
    String(payload.actorRole),
    metadata,
  );
  const receipt = await tx.wait();

  let blockchainEventId = null;
  let bugChainId = null;
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "BugEventRecorded") {
        blockchainEventId = parsed.args.eventId?.toString() ?? null;
        bugChainId = parsed.args.bugChainId?.toString() ?? null;
        break;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  console.log(JSON.stringify({
    ok: true,
    transactionHash: tx.hash,
    blockNumber: receipt?.blockNumber ?? null,
    blockchainEventId,
    bugChainId,
    contractAddress: deployment.address,
  }));
} catch (error) {
  const message = error instanceof Error ? error.message : "Unexpected blockchain CLI failure";
  fail(message);
}
