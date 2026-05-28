"use client";

import { useMemo, useState } from "react";
import { createWalletClient, custom, getAddress, keccak256, numberToHex, toBytes, type Address, type Chain, type Hash } from "viem";
import { baseSepolia, megaEthTestnet } from "../config/chains";
import { getFactoryAddress } from "../config/contracts";
import { frameVibeFactoryAbi } from "../lib/frameVibeFactoryAbi";

type Props = {
  chainId: number;
};

type DeployState = {
  status: "idle" | "wallet" | "submitting" | "success" | "error";
  message: string;
  txHash?: Hash;
};

const chains = [megaEthTestnet, baseSepolia];

async function ensureWalletChain(chain: Chain) {
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

export function CreateProjectPanel({ chainId }: Props) {
  const selectedChain = chains.find((chain) => chain.id === chainId) ?? megaEthTestnet;
  const factoryAddress = getFactoryAddress(selectedChain.id);
  const [projectName, setProjectName] = useState("FrameVibe Genesis");
  const [metadataURI, setMetadataURI] = useState("ipfs://replace-me");
  const [owner, setOwner] = useState("");
  const [state, setState] = useState<DeployState>({ status: "idle", message: "Ready for factory address." });

  const projectId = useMemo(() => {
    return keccak256(toBytes(`${selectedChain.id}:${projectName.trim().toLowerCase()}`));
  }, [projectName, selectedChain.id]);

  async function createProject() {
    try {
      if (!window.ethereum) {
        setState({ status: "error", message: "Wallet not found. Install a browser wallet to continue." });
        return;
      }

      if (!factoryAddress) {
        setState({ status: "error", message: "Factory address is not configured for this chain yet." });
        return;
      }

      setState({ status: "wallet", message: `Switching wallet to ${selectedChain.name}...` });
      await ensureWalletChain(selectedChain);

      setState({ status: "wallet", message: "Requesting wallet access..." });
      const walletClient = createWalletClient({
        chain: selectedChain,
        transport: custom(window.ethereum)
      });

      const [account] = await walletClient.requestAddresses();
      const ownerAddress = getAddress((owner || account) as Address);

      setState({ status: "submitting", message: "Submitting createProject transaction..." });
      const txHash = await walletClient.writeContract({
        account,
        address: factoryAddress,
        abi: frameVibeFactoryAbi,
        functionName: "createProject",
        args: [projectId, projectName, metadataURI, ownerAddress]
      });

      setState({ status: "success", message: "Project transaction submitted.", txHash });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transaction failed.";
      setState({ status: "error", message });
    }
  }

  return (
    <section className="create-panel" aria-label="Create FrameVibe project">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Contract workflow</p>
          <h3>Create Project</h3>
        </div>
        <span className={factoryAddress ? "pill ready" : "pill"}>{factoryAddress ? "Factory configured" : "Awaiting deploy"}</span>
      </div>

      <label>
        Project name
        <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
      </label>

      <label>
        Metadata URI
        <input value={metadataURI} onChange={(event) => setMetadataURI(event.target.value)} />
      </label>

      <label>
        Owner override
        <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Defaults to connected wallet" />
      </label>

      <div className="project-id">
        <span>Project ID</span>
        <code>{projectId}</code>
      </div>

      <button type="button" className="primary-action" disabled={!factoryAddress || state.status === "submitting"} onClick={createProject}>
        Create Project
      </button>

      <p className={`deploy-message ${state.status}`}>{state.message}</p>
      {state.txHash ? <code className="tx-hash">{state.txHash}</code> : null}
    </section>
  );
}
