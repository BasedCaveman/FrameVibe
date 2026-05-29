"use client";

import { useMemo, useState } from "react";
import { ChainSelector } from "../components/ChainSelector";
import { CreateProjectPanel } from "../components/CreateProjectPanel";
import { FrameCanvas } from "../components/FrameCanvas";
import { FrameSimulator } from "../components/FrameSimulator";
import { ReceiptTimeline } from "../components/ReceiptTimeline";
import { SponsorManagerPanel } from "../components/SponsorManagerPanel";
import { TemplateGallery } from "../components/TemplateGallery";
import { megaEthTestnet } from "../config/chains";
import { templates } from "../lib/frameTemplates";

export default function Home() {
  const [selectedChain, setSelectedChain] = useState<number>(megaEthTestnet.id);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [approveSponsor, setApproveSponsor] = useState("");
  const [approveGasLimit, setApproveGasLimit] = useState("0");

  const chainLabel = useMemo(() => {
    return selectedChain === megaEthTestnet.id ? "sub-10ms real-time flows" : "Coinbase ecosystem reach";
  }, [selectedChain]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">FrameVibe Primitive</p>
          <h1>Visual frame transactions for MegaETH and Base</h1>
        </div>
        <ChainSelector selected={selectedChain} onSelect={setSelectedChain} />
      </header>

      <section className="workspace">
        <TemplateGallery selectedId={selectedTemplate.id} onSelect={setSelectedTemplate} />

        <div className="builder">
          <div className="builder-head">
            <div>
              <p className="eyebrow">{chainLabel}</p>
              <h2>{selectedTemplate.name}</h2>
            </div>
            <button type="button" className="primary-action">Simulate</button>
          </div>

          <FrameCanvas template={selectedTemplate} />
          <CreateProjectPanel chainId={selectedChain} />
          <SponsorManagerPanel
            chainId={selectedChain}
            onSponsorChange={(sponsor, gasLimit) => {
              setApproveSponsor(sponsor);
              setApproveGasLimit(gasLimit);
            }}
          />
          <FrameSimulator chainId={selectedChain} initialSponsor={approveSponsor} initialGasLimit={approveGasLimit} />
          <ReceiptTimeline chainId={selectedChain} />

          <section className="status-grid" aria-label="Deployment status">
            <div>
              <span>Factory</span>
              <strong>CREATE2 ready</strong>
            </div>
            <div>
              <span>Security</span>
              <strong>Nonce + deadline + nonReentrant</strong>
            </div>
            <div>
              <span>Deploy</span>
              <strong>Remix contracts, Vercel dApp</strong>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
