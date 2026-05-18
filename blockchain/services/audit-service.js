import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const artifactPath = path.join(rootDir, "artifacts", "contracts", "BugAuditTrail.sol", "BugAuditTrail.json");
const deploymentPath = path.join(rootDir, "deployments", "localhost.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadContract() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Contract artifact not found. Run `npm run compile` first.");
  }

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found. Run `npm run deploy:local` first.");
  }

  const artifact = readJson(artifactPath);
  const deployment = readJson(deploymentPath);

  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  const privateKey =
    process.env.BLOCKCHAIN_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(deployment.address, artifact.abi, signer);

  return {
    rpcUrl,
    deployment,
    signer,
    contract,
  };
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let data = "";
    request.on("data", (chunk) => {
      data += chunk;
    });
    request.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    if (!request.url) {
      sendJson(response, 400, { message: "Missing request URL" });
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      const { rpcUrl, deployment } = loadContract();
      sendJson(response, 200, {
        ok: true,
        rpcUrl,
        contractAddress: deployment.address,
        chainId: deployment.chainId,
      });
      return;
    }

    if (request.method === "POST" && request.url === "/record-bug-event") {
      const body = await readBody(request);
      const required = ["bugId", "action", "actorEmail", "actorRole"];
      const missing = required.filter((field) => !body[field]);

      if (missing.length > 0) {
        sendJson(response, 422, { message: `Missing fields: ${missing.join(", ")}` });
        return;
      }

      const { contract, deployment } = loadContract();
      const metadata = typeof body.metadata === "string" ? body.metadata : JSON.stringify(body.metadata ?? {});

      const tx = await contract.recordBugEvent(
        String(body.bugId),
        String(body.action),
        String(body.actorEmail),
        String(body.actorRole),
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
          // Ignore logs that do not belong to this contract.
        }
      }

      sendJson(response, 201, {
        ok: true,
        transactionHash: tx.hash,
        blockNumber: receipt?.blockNumber ?? null,
        blockchainEventId,
        bugChainId,
        contractAddress: deployment.address,
      });
      return;
    }

    sendJson(response, 404, { message: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : "Unexpected service error",
    });
  }
});

const port = Number(process.env.BLOCKCHAIN_SERVICE_PORT || 8787);
server.listen(port, () => {
  console.log(`BlockBug blockchain audit service listening on http://127.0.0.1:${port}`);
});
