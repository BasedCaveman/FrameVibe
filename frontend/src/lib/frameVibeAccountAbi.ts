export const frameVibeAccountAbi = [
  {
    type: "function",
    name: "nonce",
    stateMutability: "view",
    inputs: [{ name: "nonceKey", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;
