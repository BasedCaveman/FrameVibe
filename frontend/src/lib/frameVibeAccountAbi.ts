export const frameVibeAccountAbi = [
  {
    type: "function",
    name: "nonce",
    stateMutability: "view",
    inputs: [{ name: "nonceKey", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "executeFrame",
    stateMutability: "payable",
    inputs: [
      {
        name: "frame",
        type: "tuple",
        components: [
          { name: "kind", type: "uint8" },
          { name: "actor", type: "address" },
          { name: "sponsor", type: "address" },
          {
            name: "calls",
            type: "tuple[]",
            components: [
              { name: "target", type: "address" },
              { name: "value", type: "uint256" },
              { name: "data", type: "bytes" }
            ]
          },
          { name: "nonceKey", type: "bytes32" },
          { name: "nonceSeq", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "gasLimit", type: "uint256" },
          { name: "recentRoot", type: "bytes32" },
          { name: "recentRootSource", type: "bytes32" },
          { name: "metadataHash", type: "bytes32" }
        ]
      },
      { name: "signature", type: "bytes" }
    ],
    outputs: [{ name: "results", type: "bytes[]" }]
  }
] as const;
