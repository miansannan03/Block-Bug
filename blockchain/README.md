# BlockBug Legacy Blockchain Workspace (Disabled)

> This implementation is retained only as commented reference code. The active
> application uses React, Laravel, and MySQL. It does not start a blockchain,
> deploy a contract, connect a wallet, or call the former audit service. Product
> wording in the frontend remains unchanged by request.

This folder is intentionally isolated from the main application so blockchain tooling can be added without changing the existing frontend or PHP backend structure.

Current scope:

1. Local blockchain tooling setup
2. Smart contract workspace scaffolding
3. Later integration with bug audit and verification proof flows

Current files:

- `hardhat.config.js`: local Hardhat configuration
- `contracts/BugAuditTrail.sol`: initial audit-trail contract for bug events
- `start-local-chain.cmd`: starts the local Hardhat blockchain node
- `start-funnel-stack.cmd`: starts the local chain, deploys the contract, starts the audit service, and opens a Tailscale Funnel
- `scripts/deploy.js`: deploys the contract to the local Hardhat chain
- `services/audit-service.js`: small HTTP service for recording blockchain audit events
- `.env.example`: local service environment variables

Local chain command:

```bash
npx hardhat node
```

Verified local RPC endpoint:

- `http://127.0.0.1:8545/`

Useful commands:

```bash
npm run compile
npm run deploy:local
npm run service
```

If you want the deployed Render backend to reach your local blockchain service, use `start-funnel-stack.cmd` after Tailscale is signed in on this machine.
