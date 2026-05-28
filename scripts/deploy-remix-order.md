# Remix Deploy Order

Use Solidity `0.8.20` or newer.

1. Upload `contracts/remix/FrameVibeRemix.sol` to Remix.
2. Compile `FrameVibeRemix.sol`.
3. Select and deploy `FrameVibeFactory` from the contract dropdown.
4. Call `createProject(projectId, name, metadataURI, owner)`.

Example values:

```text
projectId: 0x6672616d65766962650000000000000000000000000000000000000000000000
name: FrameVibe Genesis
metadataURI: ipfs://replace-me
owner: your wallet address
```

The transaction returns:

- `account`: the FrameVibe smart account for the project.
- `verifier`: the EOA/ERC-1271 signature verifier.
- `sponsorManager`: the sponsorship policy contract.

For a sponsored flow, call `setSponsorRule` on the sponsor manager, then execute an `APPROVE` frame on the account.

Optional demo support:

- Select and deploy `FrameRecentRoots` from the same single-file Remix build with your wallet as `initialOwner` if you want to simulate EIP-8272-style recent root validation in local/testnet flows.
- Use `nonceKey` and `nonceSeq` on each frame for EIP-8250-style keyed nonce lanes. A zero `nonceKey` falls back to a default lane per frame kind.
