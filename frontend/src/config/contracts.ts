import type { Address } from "viem";
import { baseSepolia, megaEthTestnet } from "./chains";

export type SupportedChainId = typeof megaEthTestnet.id | typeof baseSepolia.id;

type ContractConfig = {
  factory?: Address;
};

export const contractConfig: Record<SupportedChainId, ContractConfig> = {
  [megaEthTestnet.id]: {
    factory: process.env.NEXT_PUBLIC_MEGAETH_FACTORY_ADDRESS as Address | undefined
  },
  [baseSepolia.id]: {
    factory: process.env.NEXT_PUBLIC_BASE_SEPOLIA_FACTORY_ADDRESS as Address | undefined
  }
};

export function getFactoryAddress(chainId: number) {
  return contractConfig[chainId as SupportedChainId]?.factory;
}
