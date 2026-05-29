"use client";

import { useState } from "react";
import { createPublicClient, createWalletClient, custom, getAddress, http, type Hash } from "viem";
import { baseSepolia, megaEthTestnet } from "../config/chains";
import { getChainContracts } from "../config/contracts";
import { frameSponsorManagerAbi } from "../lib/frameSponsorManagerAbi";
import { ensureWalletChain } from "../lib/walletChain";

type Props = {
  chainId: number;
  onSponsorChange: (sponsor: string, gasLimit: string) => void;
};

const chains = [megaEthTestnet, baseSepolia];

export function SponsorManagerPanel({ chainId, onSponsorChange }: Props) {
  const selectedChain = chains.find((chain) => chain.id === chainId) ?? megaEthTestnet;
  const contracts = getChainContracts(selectedChain.id);
  const [sponsor, setSponsor] = useState("");
  const [maxGasWei, setMaxGasWei] = useState("1000000000000000");
  const [maxValueWei, setMaxValueWei] = useState("0");
  const [maxUses, setMaxUses] = useState("5");
  const [validUntil, setValidUntil] = useState("0");
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState("Sponsor rule ready.");
  const [txHash, setTxHash] = useState<Hash>();
  const [rulePreview, setRulePreview] = useState("");

  async function setRule() {
    if (!window.ethereum) {
      setStatus("Wallet not found. Install a browser wallet to continue.");
      return;
    }

    if (!contracts?.genesisSponsorManager || !contracts.genesisAccount) {
      setStatus("Sponsor manager or account is not configured for this chain.");
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
      const sponsorAddress = getAddress(sponsor || account);

      setStatus("Submitting sponsor rule...");
      const hash = await walletClient.writeContract({
        account,
        address: contracts.genesisSponsorManager,
        abi: frameSponsorManagerAbi,
        functionName: "setSponsorRule",
        args: [
          sponsorAddress,
          contracts.genesisAccount,
          BigInt(maxGasWei || "0"),
          BigInt(maxValueWei || "0"),
          Number(maxUses || "0"),
          BigInt(validUntil || "0"),
          active
        ]
      });

      setTxHash(hash);
      setStatus("Sponsor rule submitted. Waiting for receipt...");
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("Sponsor rule configured.");
      onSponsorChange(sponsorAddress, maxGasWei || "0");
      await readRule(sponsorAddress);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not set sponsor rule.";
      setStatus(message);
    }
  }

  async function readRule(sponsorOverride?: string) {
    if (!contracts?.genesisSponsorManager || !contracts.genesisAccount) {
      setStatus("Sponsor manager or account is not configured for this chain.");
      return;
    }

    try {
      const sponsorAddress = getAddress(sponsorOverride || sponsor);
      const publicClient = createPublicClient({
        chain: selectedChain,
        transport: http(selectedChain.rpcUrls.default.http[0])
      });
      const rule = await publicClient.readContract({
        address: contracts.genesisSponsorManager,
        abi: frameSponsorManagerAbi,
        functionName: "sponsorRules",
        args: [sponsorAddress, contracts.genesisAccount]
      });

      setRulePreview(JSON.stringify({
        active: rule[0],
        maxGasWei: rule[1].toString(),
        maxValueWei: rule[2].toString(),
        maxUses: rule[3],
        used: rule[4],
        validUntil: rule[5].toString()
      }, null, 2));
      setStatus("Sponsor rule loaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read sponsor rule.";
      setStatus(message);
    }
  }

  return (
    <section className="sponsor-panel" aria-label="Sponsor manager">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Sponsor Manager</p>
          <h3>Configure APPROVE Rule</h3>
        </div>
        <span className={contracts?.genesisSponsorManager ? "pill ready" : "pill"}>{contracts?.genesisSponsorManager ? "Manager configured" : "No manager"}</span>
      </div>

      <div className="simulator-grid">
        <label>
          Sponsor
          <input value={sponsor} onChange={(event) => setSponsor(event.target.value)} placeholder="Defaults to connected wallet" />
        </label>

        <label>
          Max gas wei
          <input value={maxGasWei} onChange={(event) => setMaxGasWei(event.target.value)} inputMode="numeric" />
        </label>

        <label>
          Max value wei
          <input value={maxValueWei} onChange={(event) => setMaxValueWei(event.target.value)} inputMode="numeric" />
        </label>

        <label>
          Max uses
          <input value={maxUses} onChange={(event) => setMaxUses(event.target.value)} inputMode="numeric" />
        </label>

        <label>
          Valid until
          <input value={validUntil} onChange={(event) => setValidUntil(event.target.value)} inputMode="numeric" />
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
      </div>

      <div className="action-row">
        <button type="button" className="primary-action" onClick={setRule}>Set Sponsor Rule</button>
        <button type="button" className="secondary-action" onClick={() => readRule()}>Read Rule</button>
      </div>

      <p className="deploy-message">{status}</p>
      {txHash ? <code className="tx-hash">{txHash}</code> : null}
      {rulePreview ? <pre className="frame-preview">{rulePreview}</pre> : null}
    </section>
  );
}
