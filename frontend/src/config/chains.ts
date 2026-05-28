import type { Chain } from "viem";

export const megaEthTestnet = {
  id: Number(process.env.NEXT_PUBLIC_MEGAETH_CHAIN_ID ?? 6342),
  name: "MegaETH Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH"
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MEGAETH_RPC_URL ?? "https://carrot.megaeth.com/rpc"]
    }
  },
  blockExplorers: {
    default: {
      name: "MegaETH Explorer",
      url: process.env.NEXT_PUBLIC_MEGAETH_EXPLORER_URL ?? "https://www.megaexplorer.xyz"
    }
  }
} as const satisfies Chain;

export const base = {
  id: 8453,
  name: "Base",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH"
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.base.org"]
    }
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://basescan.org"
    }
  }
} as const satisfies Chain;
