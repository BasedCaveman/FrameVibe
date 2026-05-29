export const frameSponsorManagerAbi = [
  {
    type: "function",
    name: "setSponsorRule",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sponsor", type: "address" },
      { name: "account", type: "address" },
      { name: "maxGasWei", type: "uint96" },
      { name: "maxValueWei", type: "uint96" },
      { name: "maxUses", type: "uint32" },
      { name: "validUntil", type: "uint64" },
      { name: "active", type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "sponsorRules",
    stateMutability: "view",
    inputs: [
      { name: "sponsor", type: "address" },
      { name: "account", type: "address" }
    ],
    outputs: [
      { name: "active", type: "bool" },
      { name: "maxGasWei", type: "uint96" },
      { name: "maxValueWei", type: "uint96" },
      { name: "maxUses", type: "uint32" },
      { name: "used", type: "uint32" },
      { name: "validUntil", type: "uint64" }
    ]
  }
] as const;
