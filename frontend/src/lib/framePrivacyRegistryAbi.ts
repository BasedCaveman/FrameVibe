export const framePrivacyRegistryAbi = [
  {
    type: "function",
    name: "setRoot",
    stateMutability: "nonpayable",
    inputs: [
      { name: "root", type: "bytes32" },
      { name: "approved", type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "approvedRoots",
    stateMutability: "view",
    inputs: [{ name: "root", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "usedNullifiers",
    stateMutability: "view",
    inputs: [{ name: "nullifierHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "verifyPrivateFrame",
    stateMutability: "nonpayable",
    inputs: [
      { name: "root", type: "bytes32" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "actionHash", type: "bytes32" },
      { name: "account", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;
