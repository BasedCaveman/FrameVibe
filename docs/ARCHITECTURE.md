# FrameVibe Architecture

FrameVibe is a primitive for visual, EIP-8141-style frame transaction flows. The first implementation is intentionally EVM-pure so it can be deployed from Remix to MegaETH or Base without custom tooling.

## On-chain modules

- `FrameVibeFactory`: deploys a verifier, sponsor manager, and smart account per project with CREATE2.
- `FrameVibeAccount`: owns frame execution, nonces, deadlines, validator allowlists, signatures, and atomic batch calls.
- `FrameVerifier`: validates EOAs with `ecrecover` and smart signers with ERC-1271.
- `FrameSponsorManager`: stores sponsorship rules by sponsor and account.
- `FrameExecutor`: optional relayer-friendly forwarder for signed frames.

## Frame kinds

- `VERIFY`: proves that an owner or validator has authorized a flow.
- `EXECUTION`: executes one or more calls atomically.
- `APPROVE`: consumes a sponsorship allowance before a relayer or dApp pays for the user journey.

## Security choices

- Local `ReentrancyGuardLite` avoids external dependencies for Remix.
- Every frame kind has an independent nonce.
- Deadlines prevent stale frame replay.
- Execution batches revert atomically on the first failed call.
- Validators are stored as a mapping instead of an array to avoid unbounded scans.
- Sponsor rules cap gas, value, use count, and validity window.

## MegaETH fit

MegaETH should be used for flows that need instant feedback: game session keys, sponsored onboarding, fast DeFi actions, and live UX experimentation. The frontend is prepared for short-polling or WebSocket upgrades once the selected MegaETH RPC exposes the desired subscription behavior.
