# FrameVibe

FrameVibe is a no-code oriented primitive for building visual frame transaction flows on MegaETH and Base. It separates frame UX into `VERIFY`, `EXECUTION`, and `APPROVE` layers while keeping the first deployment path simple enough for Remix, GitHub, and Vercel.

The current implementation is an EVM-compatible builder and simulator for the emerging Frame Transaction stack. It is not claiming native EIP-8141 transaction-type support on MegaETH or Base yet. Instead, it gives builders contracts, UI patterns, and documentation to prototype the model today and migrate cleanly as native support matures.

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
- `FrameRecentRoots.sol`: optional testnet/demo registry for EIP-8272-style recent root references.

The contracts are self-contained and do not require OpenZeppelin imports, which makes Remix deployment easier.

## Protocol roadmap context

FrameVibe tracks the Frame Transaction family of proposals:

- EIP-8141: frame transactions split validation, execution, and gas/payment responsibilities.
- EIP-8272: recent roots let frames reference bounded recent state roots for privacy-oriented validation.
- EIP-8250: keyed nonces let independent sessions, agents, and privacy lanes progress in parallel.
- EIP-7805 / FOCIL: inclusion-list work informs how public, bounded validation flows should be designed.

In product terms, this means FrameVibe should evolve from a basic no-code transaction builder into a visual protocol workbench for sponsored actions, session keys, privacy roots, and inclusion-friendly flows.

## Deploy with Remix

1. Open [remix.ethereum.org](https://remix.ethereum.org).
2. Upload the `contracts/` folder.
3. Compile `contracts/FrameVibeFactory.sol` with Solidity `0.8.20` or newer.
4. Deploy `FrameVibeFactory`.
5. Call `createProject(projectId, name, metadataURI, owner)`.
6. Optional: deploy `FrameRecentRoots` if you want to test recent-root-gated flows.

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
NEXT_PUBLIC_MEGAETH_CHAIN_ID=6343
NEXT_PUBLIC_MEGAETH_RPC_URL=https://carrot.megaeth.com/rpc
NEXT_PUBLIC_MEGAETH_EXPLORER_URL=https://www.megaexplorer.xyz
NEXT_PUBLIC_MEGAETH_FACTORY_ADDRESS=
NEXT_PUBLIC_BASE_SEPOLIA_FACTORY_ADDRESS=
```

## Security baseline

This primitive includes:

- Reentrancy protection on frame execution.
- Keyed nonces with `nonceKey` and `nonceSeq`.
- Deadline validation.
- Atomic batch execution.
- ERC-1271 support for smart signers.
- Mapping-based validators.
- Sponsor rules with gas, value, usage, and time caps.

## Next development steps

- Deploy `FrameVibeFactory` on Base Sepolia and MegaETH testnet, then set the factory address env vars in Vercel.
- Add a frame simulator that serializes `nonceKey`, `nonceSeq`, `recentRoot`, and sponsor rules.
- Read emitted `ProjectCreated` logs and persist account, verifier, and sponsor manager addresses in the UI.
- Add tests for signature replay, keyed nonce isolation, sponsorship caps, and batch atomicity.

Before production, add tests for your exact templates and run a contract audit. FrameVibe is a primitive, not a final audited protocol.
