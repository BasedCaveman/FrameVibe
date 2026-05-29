import { numberToHex, type Chain } from "viem";

export async function ensureWalletChain(chain: Chain) {
  if (!window.ethereum) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: numberToHex(chain.id) }]
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
    if (code !== 4902) throw error;

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: numberToHex(chain.id),
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls.default.http,
          blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : undefined
        }
      ]
    });
  }
}
