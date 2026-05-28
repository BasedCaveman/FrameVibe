# FrameVibe Architecture

FrameVibe is a primitive for visual, EIP-8141-style frame transaction flows. The first implementation is intentionally EVM-pure so it can be deployed from Remix to MegaETH or Base without custom tooling.

Until MegaETH or Base expose native EIP-8141 transaction semantics, FrameVibe should be treated as a compatibility builder and simulator. The contracts model the frame stack in ordinary EVM calls so teams can design, test, and document flows before native support lands.

## On-chain modules

- `FrameVibeFactory`: deploys a verifier, sponsor manager, and smart account per project with CREATE2.
- `FrameVibeAccount`: owns frame execution, nonces, deadlines, validator allowlists, signatures, and atomic batch calls.
- `FrameVerifier`: validates EOAs with `ecrecover` and smart signers with ERC-1271.
- `FrameSponsorManager`: stores sponsorship rules by sponsor and account.
- `FrameExecutor`: optional relayer-friendly forwarder for signed frames.
- `FrameRecentRoots`: optional demo registry for EIP-8272-style recent root references.

## Frame kinds

- `VERIFY`: proves that an owner or validator has authorized a flow.
- `EXECUTION`: executes one or more calls atomically.
- `APPROVE`: consumes a sponsorship allowance before a relayer or dApp pays for the user journey.

## Protocol alignment

- EIP-8141: separates transaction flows into validation, execution, and gas/payment frames.
- EIP-8272: recent roots can be referenced by signed frames without arbitrary validation reads.
- EIP-8250: keyed nonces enable parallel frame lanes for sessions, agents, and privacy nullifiers.
- EIP-7805 / FOCIL: public, bounded validation flows can be designed with future inclusion-list constraints in mind.

## Security choices

- Local `ReentrancyGuardLite` avoids external dependencies for Remix.
- Frames use keyed nonces with `nonceKey` and `nonceSeq`; zero `nonceKey` falls back to a default lane per frame kind.
- Deadlines prevent stale frame replay.
- Execution batches revert atomically on the first failed call.
- Validators are stored as a mapping instead of an array to avoid unbounded scans.
- Sponsor rules cap gas, value, use count, and validity window.

## MegaETH fit

MegaETH should be used for flows that need instant feedback: game session keys, sponsored onboarding, fast DeFi actions, and live UX experimentation. The frontend is prepared for short-polling or WebSocket upgrades once the selected MegaETH RPC exposes the desired subscription behavior.
