"use client";

import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, encodePacked, getAddress, http, keccak256, pad, toBytes, zeroAddress, type Hex, type Hash } from "viem";
import { baseSepolia, megaEthTestnet } from "../config/chains";
import { getChainContracts } from "../config/contracts";
import { frameVibeAccountAbi } from "../lib/frameVibeAccountAbi";
import { appendReceipt, type ReceiptKind } from "../lib/receiptTimeline";
import { minutesFromNowToTimestamp, testEthToWei, timestampToHelper, weiToTestEth } from "../lib/units";
import { ensureWalletChain } from "../lib/walletChain";

type Props = {
  chainId: number;
  initialSponsor?: string;
  initialGasLimit?: string;
};

type FrameKind = "VERIFY" | "EXECUTION" | "APPROVE";
type ManualCall = {
  target: string;
  value: string;
  data: Hex;
};

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

export function FrameSimulator({ chainId, initialSponsor, initialGasLimit }: Props) {
  const selectedChain = chains.find((chain) => chain.id === chainId) ?? megaEthTestnet;
  const contracts = getChainContracts(selectedChain.id);
  const [kind, setKind] = useState<FrameKind>("VERIFY");
  const [actor, setActor] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [nonceKey, setNonceKey] = useState<Hex>(defaultNonceKey("VERIFY"));
  const [nonceSeq, setNonceSeq] = useState("0");
  const [deadlineMinutes, setDeadlineMinutes] = useState("0");
  const [gasLimit, setGasLimit] = useState("0");
  const [recentRoot, setRecentRoot] = useState<Hex>(zeroBytes32);
  const [recentRootSource, setRecentRootSource] = useState<Hex>(zeroBytes32);
  const [metadataText, setMetadataText] = useState("framevibe:simulator:v1");
  const [callTarget, setCallTarget] = useState("");
  const [callValueEth, setCallValueEth] = useState("0");
  const [callData, setCallData] = useState<Hex>("0x");
  const [calls, setCalls] = useState<ManualCall[]>([]);
  const [nonceStatus, setNonceStatus] = useState("Ready.");
  const [executeStatus, setExecuteStatus] = useState("VERIFY execution ready.");
  const [executeTx, setExecuteTx] = useState<Hash>();

  const metadataHash = useMemo(() => keccak256(toBytes(metadataText || "framevibe")), [metadataText]);
  const deadline = useMemo(() => minutesFromNowToTimestamp(deadlineMinutes), [deadlineMinutes]);

  const framePreview = useMemo(() => {
    return {
      account: contracts?.genesisAccount ?? "not configured",
      kind,
      kindIndex: frameKindMap[kind],
      actor: actor || "connected wallet / account owner",
      sponsor: sponsor || "0x0000000000000000000000000000000000000000",
      calls,
      nonceKey,
      nonceSeq,
      deadline,
      gasLimit,
      recentRoot,
      recentRootSource,
      metadataHash
    };
  }, [actor, calls, contracts?.genesisAccount, deadline, gasLimit, kind, metadataHash, nonceKey, nonceSeq, recentRoot, recentRootSource, sponsor]);

  useEffect(() => {
    setNonceKey(defaultNonceKey(kind));
  }, [kind]);

  useEffect(() => {
    if (initialSponsor) setSponsor(initialSponsor);
  }, [initialSponsor]);

  useEffect(() => {
    if (initialGasLimit) setGasLimit(initialGasLimit);
  }, [initialGasLimit]);

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

  async function executeCurrentFrame(expectedKind: FrameKind) {
    if (kind !== expectedKind) {
      setExecuteStatus(`Switch frame kind to ${expectedKind} first.`);
      return;
    }

    if (expectedKind === "EXECUTION" && calls.length === 0) {
      setExecuteStatus("Add an action first. For a safe test, use your own wallet as the target, 0 test ETH, and 0x calldata.");
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
        calls: calls.map((call) => ({
          target: getAddress(call.target),
          value: BigInt(call.value || "0"),
          data: call.data || "0x"
        })),
        nonceKey,
        nonceSeq: BigInt(nonceSeq || "0"),
        deadline: BigInt(deadline || "0"),
        gasLimit: BigInt(gasLimit || "0"),
        recentRoot,
        recentRootSource,
        metadataHash
      };

      setExecuteStatus(`Submitting ${expectedKind} frame...`);
      const txHash = await walletClient.writeContract({
        account,
        address: contracts.genesisAccount,
        abi: frameVibeAccountAbi,
        functionName: "executeFrame",
        args: [frame, "0x"]
      });
      setExecuteTx(txHash);

      setExecuteStatus(`${expectedKind} submitted. Waiting for receipt...`);
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      appendReceipt({
        chainId: selectedChain.id,
        kind: expectedKind as ReceiptKind,
        title: `${expectedKind} frame executed`,
        txHash,
        detail: `Nonce key ${nonceKey}`
      });
      setExecuteStatus(`${expectedKind} frame executed. Refreshing nonce...`);
      await refreshNonce();
      setExecuteStatus(`${expectedKind} frame executed.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${expectedKind} execution failed.`;
      setExecuteStatus(message);
    }
  }

  async function executeVerifyFrame() {
    await executeCurrentFrame("VERIFY");
  }

  async function executeExecutionFrame() {
    await executeCurrentFrame("EXECUTION");
  }

  async function executeApproveFrame() {
    await executeCurrentFrame("APPROVE");
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

  function normalizeCalldata(value: string) {
    if (!value || value === "0x") {
      setCallData("0x");
      return;
    }
    setCallData((value.startsWith("0x") ? value : `0x${value}`) as Hex);
  }

  function addCall() {
    try {
      const normalizedTarget = getAddress(callTarget);
      const valueWei = testEthToWei(callValueEth);
      setCalls((currentCalls) => [
        ...currentCalls,
        {
          target: normalizedTarget,
          value: valueWei,
          data: callData || "0x"
        }
      ]);
      setCallTarget("");
      setCallValueEth("0");
      setCallData("0x");
      setExecuteStatus("Action added. You can now execute the EXECUTION frame.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid call.";
      setExecuteStatus(message);
    }
  }

  function removeCall(index: number) {
    setCalls((currentCalls) => currentCalls.filter((_, callIndex) => callIndex !== index));
  }

  return (
    <section className="simulator-panel" aria-label="Frame simulator">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Frame Simulator</p>
          <h3>Test Your Flow</h3>
        </div>
        <span className={contracts?.genesisAccount ? "pill ready" : "pill"}>{contracts?.genesisAccount ? "Account configured" : "No account"}</span>
      </div>

      <div className="simulator-grid">
        <label>
          Step to test
          <select value={kind} onChange={(event) => setKind(event.target.value as FrameKind)}>
            <option value="VERIFY">Check access</option>
            <option value="EXECUTION">Run an action</option>
            <option value="APPROVE">Use sponsored gas</option>
          </select>
        </label>

        <label>
          Acting wallet
          <small>Leave empty to use your connected wallet.</small>
          <input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="Use connected wallet" />
        </label>

        <label>
          Gas sponsor
          <small>Required only when testing sponsored gas.</small>
          <input value={sponsor} onChange={(event) => setSponsor(event.target.value)} placeholder="Sponsor wallet address" />
        </label>

        <label>
          Expires in minutes
          <small>Use 0 for no expiration. Current value: {timestampToHelper(deadline)}</small>
          <input value={deadlineMinutes} onChange={(event) => setDeadlineMinutes(event.target.value)} inputMode="numeric" />
        </label>

        <label>
          Sponsor budget
          <small>Auto-filled after setting a sponsor rule.</small>
          <input value={gasLimit} onChange={(event) => setGasLimit(event.target.value)} inputMode="numeric" />
        </label>

        <label>
          Label
          <small>A human-readable tag for this test.</small>
          <input value={metadataText} onChange={(event) => setMetadataText(event.target.value)} />
        </label>
      </div>

      <div className="nonce-row">
        <label>
          Test lane
          <small>Use default lane unless you are testing parallel sessions.</small>
          <input value={nonceKey} onChange={(event) => normalizeBytes32(event.target.value, setNonceKey)} />
        </label>
        <button type="button" onClick={useDefaultLane}>Default lane</button>
        <button type="button" onClick={refreshNonce}>Read nonce</button>
      </div>

      <div className="simulator-grid">
        <label>
          Next run number
          <small>Read this before executing. It prevents replay mistakes.</small>
          <input value={nonceSeq} onChange={(event) => setNonceSeq(event.target.value)} inputMode="numeric" />
        </label>

        <label>
          Privacy root
          <small>Advanced: used by private/ZK flows.</small>
          <input value={recentRoot} onChange={(event) => normalizeBytes32(event.target.value, setRecentRoot)} />
        </label>

        <label>
          Privacy root source
          <small>Advanced: identifies where the root came from.</small>
          <input value={recentRootSource} onChange={(event) => normalizeBytes32(event.target.value, setRecentRootSource)} />
        </label>
      </div>

      {kind === "EXECUTION" ? (
        <section className="calls-builder" aria-label="Execution calls">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Execution calls</p>
              <h3>Action Builder</h3>
            </div>
            <span className="pill">{calls.length} calls</span>
          </div>

          <div className="simulator-grid">
            <label>
              Where should this action go?
              <small>For a safe first test, paste your own wallet address.</small>
              <input value={callTarget} onChange={(event) => setCallTarget(event.target.value)} placeholder="Wallet or contract address" />
            </label>

            <label>
              Amount of test ETH
              <small>Use 0 for a harmless test.</small>
              <input value={callValueEth} onChange={(event) => setCallValueEth(event.target.value)} inputMode="decimal" />
            </label>

            <label>
              Contract data
              <small>Use 0x when you are not calling a contract function.</small>
              <input value={callData} onChange={(event) => normalizeCalldata(event.target.value)} placeholder="0x" />
            </label>
          </div>

          <button type="button" className="secondary-action" onClick={addCall}>Add action</button>

          {calls.length > 0 ? (
            <div className="call-list">
              {calls.map((call, index) => (
                <div key={`${call.target}-${index}`}>
                  <span>Call {index + 1}</span>
                  <code>{call.target}</code>
                  <small>{weiToTestEth(call.value)} test ETH / {call.data}</small>
                  <button type="button" onClick={() => removeCall(index)}>Remove</button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="deploy-message">{nonceStatus}</p>
      <button type="button" className="primary-action" disabled={kind !== "VERIFY"} onClick={executeVerifyFrame}>
        Run access check
      </button>
      <button type="button" className="primary-action execution-action" disabled={kind !== "EXECUTION" || calls.length === 0} onClick={executeExecutionFrame}>
        Run action
      </button>
      <button type="button" className="primary-action approve-action" disabled={kind !== "APPROVE" || !sponsor} onClick={executeApproveFrame}>
        Use sponsored gas
      </button>
      <p className="deploy-message">{executeStatus}</p>
      {executeTx ? <code className="tx-hash">{executeTx}</code> : null}
      <pre className="frame-preview">{JSON.stringify(framePreview, null, 2)}</pre>
    </section>
  );
}
