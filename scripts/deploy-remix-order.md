# Remix Deploy Order

Use Solidity `0.8.20` or newer.

1. Upload the `contracts/` folder to Remix.
2. Compile `FrameVibeFactory.sol`.
3. Deploy `FrameVibeFactory`.
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
