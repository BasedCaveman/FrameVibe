import type { Address } from "viem";
import { baseSepolia, megaEthTestnet } from "./chains";

export type SupportedChainId = typeof megaEthTestnet.id | typeof baseSepolia.id;

type ContractConfig = {
  factory?: Address;
  genesisAccount?: Address;
  genesisVerifier?: Address;
  genesisSponsorManager?: Address;
  privacyRegistry?: Address;
};

export const contractConfig: Record<SupportedChainId, ContractConfig> = {
  [megaEthTestnet.id]: {
    factory: process.env.NEXT_PUBLIC_MEGAETH_FACTORY_ADDRESS as Address | undefined,
    genesisAccount: "0xA81f843Cc9E7842f502C9831C712b1472532d330",
    genesisVerifier: "0xfEdA46a5d244C4Fc155059Fbbb1FeA6978EB6809",
    genesisSponsorManager: "0x62F449752eCd219FEcb66ff816037A19CB7098d3",
    privacyRegistry: (process.env.NEXT_PUBLIC_MEGAETH_PRIVACY_REGISTRY_ADDRESS ?? "0xc19791284342Ac2F6030cC6C0C170F559642f135") as Address
  },
  [baseSepolia.id]: {
    factory: process.env.NEXT_PUBLIC_BASE_SEPOLIA_FACTORY_ADDRESS as Address | undefined,
    genesisAccount: "0x95Bb81ceA8766AE0b1787D7bb5F764F1635f3dA3",
    genesisVerifier: "0xfDEB69993750E25bbe46d2c0D14F21cE175Cb245",
    genesisSponsorManager: "0xCa4882Ff6821454E540E0c41427425542437B07c",
    privacyRegistry: (process.env.NEXT_PUBLIC_BASE_SEPOLIA_PRIVACY_REGISTRY_ADDRESS ?? "0x7ff64aC54827360A860d8EbD13Bf39e0eb68fE5A") as Address
  }
};

export function getFactoryAddress(chainId: number) {
  return contractConfig[chainId as SupportedChainId]?.factory;
}

export function getChainContracts(chainId: number) {
  return contractConfig[chainId as SupportedChainId];
}
