export const frameVibeFactoryAbi = [
  {
    type: "function",
    name: "createProject",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectId", type: "bytes32" },
      { name: "name", type: "string" },
      { name: "metadataURI", type: "string" },
      { name: "owner", type: "address" }
    ],
    outputs: [
      { name: "account", type: "address" },
      { name: "verifier", type: "address" },
      { name: "sponsorManager", type: "address" }
    ]
  },
  {
    type: "event",
    name: "ProjectCreated",
    inputs: [
      { name: "projectId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "verifier", type: "address", indexed: false },
      { name: "sponsorManager", type: "address", indexed: false },
      { name: "name", type: "string", indexed: false }
    ]
  }
] as const;
