"use client";

import { useState } from "react";
import { createPublicClient, createWalletClient, custom, getAddress, http, type Address, type Hash } from "viem";
import { baseSepolia, megaEthTestnet } from "../config/chains";
import { getChainContracts } from "../config/contracts";
import { frameSponsorManagerAbi } from "../lib/frameSponsorManagerAbi";
import { appendReceipt } from "../lib/receiptTimeline";
import { minutesFromNowToTimestamp, testEthToWei, timestampToHelper } from "../lib/units";
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
  const [gasBudgetEth, setGasBudgetEth] = useState("0.001");
  const [valueBudgetEth, setValueBudgetEth] = useState("0");
  const [maxUses, setMaxUses] = useState("5");
  const [validForMinutes, setValidForMinutes] = useState("0");
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState("Sponsor rule ready.");
  const [txHash, setTxHash] = useState<Hash>();
  const [rulePreview, setRulePreview] = useState("");
  const [lastSponsor, setLastSponsor] = useState("");

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
      const maxGasWei = testEthToWei(gasBudgetEth);
      const maxValueWei = testEthToWei(valueBudgetEth);
      const validUntil = minutesFromNowToTimestamp(validForMinutes);
      setSponsor(sponsorAddress);
      setLastSponsor(sponsorAddress);

      setStatus("Submitting sponsor rule...");
      const hash = await walletClient.writeContract({
        account,
        address: contracts.genesisSponsorManager,
        abi: frameSponsorManagerAbi,
        functionName: "setSponsorRule",
        args: [
          sponsorAddress,
          contracts.genesisAccount,
          BigInt(maxGasWei),
          BigInt(maxValueWei),
          Number(maxUses || "0"),
          BigInt(validUntil),
          active
        ]
      });

      setTxHash(hash);
      setStatus("Sponsor rule submitted. Waiting for receipt...");
      await publicClient.waitForTransactionReceipt({ hash });
      appendReceipt({
        chainId: selectedChain.id,
        kind: "SPONSOR_RULE",
        title: "Sponsor rule set",
        txHash: hash,
        detail: `Sponsor ${sponsorAddress}`
      });
      setStatus("Sponsor rule configured.");
      onSponsorChange(sponsorAddress, maxGasWei);
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
      let sponsorAddress = sponsorOverride || sponsor || lastSponsor;
      if (!sponsorAddress) {
        if (!window.ethereum) {
          setStatus("Enter a sponsor address or connect a wallet first.");
          return;
        }

        await ensureWalletChain(selectedChain);
        const walletClient = createWalletClient({
          chain: selectedChain,
          transport: custom(window.ethereum)
        });
        const [account] = await walletClient.requestAddresses();
        sponsorAddress = account;
      }

      const normalizedSponsor = getAddress(sponsorAddress) as Address;
      setSponsor(normalizedSponsor);
      setLastSponsor(normalizedSponsor);

      const publicClient = createPublicClient({
        chain: selectedChain,
        transport: http(selectedChain.rpcUrls.default.http[0])
      });
      const rule = await publicClient.readContract({
        address: contracts.genesisSponsorManager,
        abi: frameSponsorManagerAbi,
        functionName: "sponsorRules",
        args: [normalizedSponsor, contracts.genesisAccount]
      });

      setRulePreview(JSON.stringify({
        active: rule[0],
        maxGasWei: rule[1].toString(),
        maxValueWei: rule[2].toString(),
        maxGasTestEth: Number(rule[1]) / 1e18,
        maxValueTestEth: Number(rule[2]) / 1e18,
        maxUses: rule[3],
        used: rule[4],
        validUntil: rule[5].toString(),
        validUntilLabel: timestampToHelper(rule[5].toString())
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
          <h3>Choose Who Can Pay Gas</h3>
        </div>
        <span className={contracts?.genesisSponsorManager ? "pill ready" : "pill"}>{contracts?.genesisSponsorManager ? "Manager configured" : "No manager"}</span>
      </div>

      <div className="simulator-grid">
        <label>
          Sponsor
          <small>The wallet allowed to sponsor this flow. Leave empty to use your connected wallet.</small>
          <input value={sponsor} onChange={(event) => setSponsor(event.target.value)} placeholder="Use my connected wallet" />
        </label>

        <label>
          Gas budget
          <small>Maximum test ETH this rule can cover for gas-like usage.</small>
          <input value={gasBudgetEth} onChange={(event) => setGasBudgetEth(event.target.value)} inputMode="decimal" />
        </label>

        <label>
          Transfer budget
          <small>Maximum test ETH value that sponsored calls can move. Keep 0 for simple tests.</small>
          <input value={valueBudgetEth} onChange={(event) => setValueBudgetEth(event.target.value)} inputMode="decimal" />
        </label>

        <label>
          Number of uses
          <small>How many times this sponsor rule can be consumed.</small>
          <input value={maxUses} onChange={(event) => setMaxUses(event.target.value)} inputMode="numeric" />
        </label>

        <label>
          Expires in minutes
          <small>Use 0 for no expiration.</small>
          <input value={validForMinutes} onChange={(event) => setValidForMinutes(event.target.value)} inputMode="numeric" />
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
