"use client";

import { useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, encodePacked, getAddress, http, keccak256, pad, toBytes, type Hex, type Hash } from "viem";
import { baseSepolia, megaEthTestnet } from "../config/chains";
import { getChainContracts } from "../config/contracts";
import { framePrivacyRegistryAbi } from "../lib/framePrivacyRegistryAbi";
import { appendReceipt } from "../lib/receiptTimeline";
import { ensureWalletChain } from "../lib/walletChain";

type Props = {
  chainId: number;
};

const zeroBytes32 = `0x${"0".repeat(64)}` as Hex;
const chains = [megaEthTestnet, baseSepolia];

export function PrivateVerifyPanel({ chainId }: Props) {
  const selectedChain = chains.find((chain) => chain.id === chainId) ?? megaEthTestnet;
  const contracts = getChainContracts(selectedChain.id);
  const [rootSeed, setRootSeed] = useState("framevibe:private-root:v1");
  const [nullifierSeed, setNullifierSeed] = useState("framevibe:nullifier:v1");
  const [actionSeed, setActionSeed] = useState("framevibe:private-verify:v1");
  const [approved, setApproved] = useState(true);
  const [status, setStatus] = useState("Private VERIFY mock ready.");
  const [txHash, setTxHash] = useState<Hash>();
  const [registryState, setRegistryState] = useState("");

  const root = useMemo(() => keccak256(toBytes(rootSeed || "root")), [rootSeed]);
  const nullifierHash = useMemo(() => keccak256(toBytes(nullifierSeed || "nullifier")), [nullifierSeed]);
  const actionHash = useMemo(() => {
    const account = contracts?.genesisAccount ?? "0x0000000000000000000000000000000000000000";
    return keccak256(encodePacked(["string", "uint256", "address", "bytes32"], [actionSeed || "action", BigInt(selectedChain.id), account, root]));
  }, [actionSeed, contracts?.genesisAccount, root, selectedChain.id]);

  function normalizeBytes32(value: string, setter: (value: string) => void) {
    if (value.startsWith("0x")) {
      setter(pad(value as Hex, { size: 32 }));
      return;
    }
    setter(value);
  }

  async function setRoot() {
    if (!window.ethereum) {
      setStatus("Wallet not found. Install a browser wallet to continue.");
      return;
    }

    if (!contracts?.privacyRegistry) {
      setStatus("Deploy FramePrivacyRegistry and set the registry env var first.");
      return;
    }

    try {
      setStatus(`Switching wallet to ${selectedChain.name}...`);
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
      const hash = await walletClient.writeContract({
        account,
        address: contracts.privacyRegistry,
        abi: framePrivacyRegistryAbi,
        functionName: "setRoot",
        args: [root, approved]
      });

      setTxHash(hash);
      setStatus("Privacy root submitted. Waiting for receipt...");
      await publicClient.waitForTransactionReceipt({ hash });
      appendReceipt({
        chainId: selectedChain.id,
        kind: "PRIVACY_ROOT",
        title: approved ? "Privacy root approved" : "Privacy root revoked",
        txHash: hash,
        detail: root
      });
      setStatus("Privacy root updated.");
      await readState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not set privacy root.";
      setStatus(message);
    }
  }

  async function readState() {
    if (!contracts?.privacyRegistry) {
      setStatus("Deploy FramePrivacyRegistry and set the registry env var first.");
      return;
    }

    try {
      const publicClient = createPublicClient({
        chain: selectedChain,
        transport: http(selectedChain.rpcUrls.default.http[0])
      });
      const [rootApproved, nullifierUsed] = await Promise.all([
        publicClient.readContract({
          address: contracts.privacyRegistry,
          abi: framePrivacyRegistryAbi,
          functionName: "approvedRoots",
          args: [root]
        }),
        publicClient.readContract({
          address: contracts.privacyRegistry,
          abi: framePrivacyRegistryAbi,
          functionName: "usedNullifiers",
          args: [nullifierHash]
        })
      ]);

      setRegistryState(JSON.stringify({
        root,
        rootApproved,
        nullifierHash,
        nullifierUsed,
        actionHash
      }, null, 2));
      setStatus("Privacy state loaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read privacy state.";
      setStatus(message);
    }
  }

  async function verifyPrivateFrame() {
    if (!window.ethereum) {
      setStatus("Wallet not found. Install a browser wallet to continue.");
      return;
    }

    if (!contracts?.privacyRegistry || !contracts.genesisAccount) {
      setStatus("Privacy registry or FrameVibe account is not configured for this chain.");
      return;
    }

    try {
      setStatus(`Switching wallet to ${selectedChain.name}...`);
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
      const hash = await walletClient.writeContract({
        account,
        address: contracts.privacyRegistry,
        abi: framePrivacyRegistryAbi,
        functionName: "verifyPrivateFrame",
        args: [root, nullifierHash, actionHash, getAddress(contracts.genesisAccount)]
      });

      setTxHash(hash);
      setStatus("Private VERIFY submitted. Waiting for receipt...");
      await publicClient.waitForTransactionReceipt({ hash });
      appendReceipt({
        chainId: selectedChain.id,
        kind: "PRIVATE_VERIFY",
        title: "Private VERIFY mock consumed",
        txHash: hash,
        detail: `Nullifier ${nullifierHash}`
      });
      setStatus("Private VERIFY mock executed.");
      await readState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not verify private frame.";
      setStatus(message);
    }
  }

  return (
    <section className="privacy-panel" aria-label="Private verify mock">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Privacy Mode</p>
          <h3>Private VERIFY Mock</h3>
        </div>
        <span className={contracts?.privacyRegistry ? "pill ready" : "pill"}>{contracts?.privacyRegistry ? "Registry configured" : "Deploy needed"}</span>
      </div>

      <div className="simulator-grid">
        <label>
          Root seed or bytes32
          <input value={rootSeed} onChange={(event) => normalizeBytes32(event.target.value, setRootSeed)} />
        </label>

        <label>
          Nullifier seed or bytes32
          <input value={nullifierSeed} onChange={(event) => normalizeBytes32(event.target.value, setNullifierSeed)} />
        </label>

        <label>
          Action seed
          <input value={actionSeed} onChange={(event) => setActionSeed(event.target.value)} />
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
          Root approved
        </label>
      </div>

      <div className="action-row">
        <button type="button" className="primary-action" disabled={!contracts?.privacyRegistry} onClick={setRoot}>Set Root</button>
        <button type="button" className="secondary-action" disabled={!contracts?.privacyRegistry} onClick={readState}>Read State</button>
        <button type="button" className="primary-action approve-action" disabled={!contracts?.privacyRegistry} onClick={verifyPrivateFrame}>Private VERIFY</button>
      </div>

      <p className="deploy-message">{status}</p>
      {txHash ? <code className="tx-hash">{txHash}</code> : null}
      <pre className="frame-preview">{registryState || JSON.stringify({ root, nullifierHash, actionHash }, null, 2)}</pre>
    </section>
  );
}
