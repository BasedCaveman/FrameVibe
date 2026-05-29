"use client";

import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, encodePacked, getAddress, http, keccak256, pad, toBytes, zeroAddress, type Hex, type Hash } from "viem";
import { baseSepolia, megaEthTestnet } from "../config/chains";
import { getChainContracts } from "../config/contracts";
import { frameVibeAccountAbi } from "../lib/frameVibeAccountAbi";
import { ensureWalletChain } from "../lib/walletChain";

type Props = {
  chainId: number;
};

type FrameKind = "VERIFY" | "EXECUTION" | "APPROVE";

const zeroBytes32 = `0x${"0".repeat(64)}` as Hex;
const frameKindMap: Record<FrameKind, number> = {
  VERIFY: 0,
  EXECUTION: 1,
  APPROVE: 2
};
const chains = [megaEthTestnet, baseSepolia];

function defaultNonceKey(kind: FrameKind) {
  return keccak256(encodePacked(["string", "uint8"], ["FRAMEVIBE_DEFAULT_NONCE", frameKindMap[kind]]));
}

export function FrameSimulator({ chainId }: Props) {
  const selectedChain = chains.find((chain) => chain.id === chainId) ?? megaEthTestnet;
  const contracts = getChainContracts(selectedChain.id);
  const [kind, setKind] = useState<FrameKind>("VERIFY");
  const [actor, setActor] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [nonceKey, setNonceKey] = useState<Hex>(defaultNonceKey("VERIFY"));
  const [nonceSeq, setNonceSeq] = useState("0");
  const [deadline, setDeadline] = useState("0");
  const [gasLimit, setGasLimit] = useState("0");
  const [recentRoot, setRecentRoot] = useState<Hex>(zeroBytes32);
  const [recentRootSource, setRecentRootSource] = useState<Hex>(zeroBytes32);
  const [metadataText, setMetadataText] = useState("framevibe:simulator:v1");
  const [nonceStatus, setNonceStatus] = useState("Ready.");
  const [executeStatus, setExecuteStatus] = useState("VERIFY execution ready.");
  const [executeTx, setExecuteTx] = useState<Hash>();

  const metadataHash = useMemo(() => keccak256(toBytes(metadataText || "framevibe")), [metadataText]);

  const framePreview = useMemo(() => {
    return {
      account: contracts?.genesisAccount ?? "not configured",
      kind,
      kindIndex: frameKindMap[kind],
      actor: actor || "connected wallet / account owner",
      sponsor: sponsor || "0x0000000000000000000000000000000000000000",
      calls: [],
      nonceKey,
      nonceSeq,
      deadline,
      gasLimit,
      recentRoot,
      recentRootSource,
      metadataHash
    };
  }, [actor, contracts?.genesisAccount, deadline, gasLimit, kind, metadataHash, nonceKey, nonceSeq, recentRoot, recentRootSource, sponsor]);

  useEffect(() => {
    setNonceKey(defaultNonceKey(kind));
  }, [kind]);

  async function refreshNonce() {
    if (!contracts?.genesisAccount) {
      setNonceStatus("No account configured for this chain.");
      return;
    }

    try {
      setNonceStatus("Reading nonce from account...");
      const publicClient = createPublicClient({
        chain: selectedChain,
        transport: http(selectedChain.rpcUrls.default.http[0])
      });
      const value = await publicClient.readContract({
        address: contracts.genesisAccount,
        abi: frameVibeAccountAbi,
        functionName: "nonce",
        args: [nonceKey]
      });
      setNonceSeq(value.toString());
      setNonceStatus("Nonce loaded from chain.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read nonce.";
      setNonceStatus(message);
    }
  }

  async function executeVerifyFrame() {
    if (kind !== "VERIFY") {
      setExecuteStatus("Only VERIFY execution is enabled in this increment.");
      return;
    }

    if (!window.ethereum) {
      setExecuteStatus("Wallet not found. Install a browser wallet to continue.");
      return;
    }

    if (!contracts?.genesisAccount) {
      setExecuteStatus("No account configured for this chain.");
      return;
    }

    try {
      setExecuteStatus(`Switching wallet to ${selectedChain.name}...`);
      await ensureWalletChain(selectedChain);

      const walletClient = createWalletClient({
        chain: selectedChain,
        transport: custom(window.ethereum)
      });
      const publicClient = createPublicClient({
        chain: selectedChain,
        transport: http(selectedChain.rpcUrls.default.http[0])
      });
      const [account] = await walletClient.requestAddresses();

      const frame = {
        kind: frameKindMap[kind],
        actor: actor ? getAddress(actor) : account,
        sponsor: sponsor ? getAddress(sponsor) : zeroAddress,
        calls: [],
        nonceKey,
        nonceSeq: BigInt(nonceSeq || "0"),
        deadline: BigInt(deadline || "0"),
        gasLimit: BigInt(gasLimit || "0"),
        recentRoot,
        recentRootSource,
        metadataHash
      };

      setExecuteStatus("Submitting VERIFY frame...");
      const txHash = await walletClient.writeContract({
        account,
        address: contracts.genesisAccount,
        abi: frameVibeAccountAbi,
        functionName: "executeFrame",
        args: [frame, "0x"]
      });
      setExecuteTx(txHash);

      setExecuteStatus("VERIFY submitted. Waiting for receipt...");
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setExecuteStatus("VERIFY frame executed. Refreshing nonce...");
      await refreshNonce();
      setExecuteStatus("VERIFY frame executed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "VERIFY execution failed.";
      setExecuteStatus(message);
    }
  }

  function useDefaultLane() {
    setNonceKey(defaultNonceKey(kind));
  }

  function normalizeBytes32(value: string, setter: (value: Hex) => void) {
    if (!value || value === "0x") {
      setter(zeroBytes32);
      return;
    }
    setter(pad(value as Hex, { size: 32 }));
  }

  return (
    <section className="simulator-panel" aria-label="Frame simulator">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Frame Simulator</p>
          <h3>Build Frame Preview</h3>
        </div>
        <span className={contracts?.genesisAccount ? "pill ready" : "pill"}>{contracts?.genesisAccount ? "Account configured" : "No account"}</span>
      </div>

      <div className="simulator-grid">
        <label>
          Frame kind
          <select value={kind} onChange={(event) => setKind(event.target.value as FrameKind)}>
            <option value="VERIFY">VERIFY</option>
            <option value="EXECUTION">EXECUTION</option>
            <option value="APPROVE">APPROVE</option>
          </select>
        </label>

        <label>
          Actor
          <input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="Defaults to account owner" />
        </label>

        <label>
          Sponsor
          <input value={sponsor} onChange={(event) => setSponsor(event.target.value)} placeholder="Required for APPROVE later" />
        </label>

        <label>
          Deadline
          <input value={deadline} onChange={(event) => setDeadline(event.target.value)} inputMode="numeric" />
        </label>

        <label>
          Gas limit
          <input value={gasLimit} onChange={(event) => setGasLimit(event.target.value)} inputMode="numeric" />
        </label>

        <label>
          Metadata
          <input value={metadataText} onChange={(event) => setMetadataText(event.target.value)} />
        </label>
      </div>

      <div className="nonce-row">
        <label>
          Nonce key
          <input value={nonceKey} onChange={(event) => normalizeBytes32(event.target.value, setNonceKey)} />
        </label>
        <button type="button" onClick={useDefaultLane}>Default lane</button>
        <button type="button" onClick={refreshNonce}>Read nonce</button>
      </div>

      <div className="simulator-grid">
        <label>
          Nonce seq
          <input value={nonceSeq} onChange={(event) => setNonceSeq(event.target.value)} inputMode="numeric" />
        </label>

        <label>
          Recent root
          <input value={recentRoot} onChange={(event) => normalizeBytes32(event.target.value, setRecentRoot)} />
        </label>

        <label>
          Recent root source
          <input value={recentRootSource} onChange={(event) => normalizeBytes32(event.target.value, setRecentRootSource)} />
        </label>
      </div>

      <p className="deploy-message">{nonceStatus}</p>
      <button type="button" className="primary-action" disabled={kind !== "VERIFY"} onClick={executeVerifyFrame}>
        Execute VERIFY Frame
      </button>
      <p className="deploy-message">{executeStatus}</p>
      {executeTx ? <code className="tx-hash">{executeTx}</code> : null}
      <pre className="frame-preview">{JSON.stringify(framePreview, null, 2)}</pre>
    </section>
  );
}
