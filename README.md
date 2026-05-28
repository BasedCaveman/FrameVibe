# FrameVibe

FrameVibe is a no-code oriented primitive for building visual frame transaction flows on MegaETH and Base. It separates frame UX into `VERIFY`, `EXECUTION`, and `APPROVE` layers while keeping the first deployment path simple enough for Remix, GitHub, and Vercel.

## What is included

- Solidity contracts in `contracts/`
- Remix deploy notes in `scripts/deploy-remix-order.md`
- Architecture notes in `docs/ARCHITECTURE.md`
- Next.js dApp in `frontend/`

## Contracts

- `FrameVibeFactory.sol`: deploys project accounts with CREATE2.
- `FrameVibeAccount.sol`: validates and executes frame flows.
- `FrameVerifier.sol`: supports EOA signatures and ERC-1271 smart signers.
- `FrameSponsorManager.sol`: manages sponsorship limits.
- `FrameExecutor.sol`: forwards signed frames through a relayer.

The contracts are self-contained and do not require OpenZeppelin imports, which makes Remix deployment easier.

## Deploy with Remix

1. Open [remix.ethereum.org](https://remix.ethereum.org).
2. Upload the `contracts/` folder.
3. Compile `contracts/FrameVibeFactory.sol` with Solidity `0.8.20` or newer.
4. Deploy `FrameVibeFactory`.
5. Call `createProject(projectId, name, metadataURI, owner)`.

See `scripts/deploy-remix-order.md` for sample parameters.

## Run the dApp locally

```bash
cd frontend
npm install
npm run dev
```

## Publish on Vercel

Set the Vercel project root to `frontend/`. Next.js is the better fit here because FrameVibe is expected to grow beyond a pure wallet UI into hosted flows, docs, templates, auth, and API-backed AI assistance.

Optional environment variables:

```bash
NEXT_PUBLIC_MEGAETH_CHAIN_ID=6342
NEXT_PUBLIC_MEGAETH_RPC_URL=https://carrot.megaeth.com/rpc
NEXT_PUBLIC_MEGAETH_EXPLORER_URL=https://www.megaexplorer.xyz
```

## Security baseline

This primitive includes:

- Reentrancy protection on frame execution.
- Per-kind nonces.
- Deadline validation.
- Atomic batch execution.
- ERC-1271 support for smart signers.
- Mapping-based validators.
- Sponsor rules with gas, value, usage, and time caps.

Before production, add tests for your exact templates and run a contract audit. FrameVibe is a primitive, not a final audited protocol.
