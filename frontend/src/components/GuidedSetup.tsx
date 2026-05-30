"use client";

import { useEffect, useMemo, useState } from "react";
import { readReceiptTimeline, type ReceiptEntry, type ReceiptKind } from "../lib/receiptTimeline";

type Props = {
  chainId: number;
};

type GuideStep = {
  kind: ReceiptKind;
  title: string;
  description: string;
  targetId: string;
  action: string;
};

const steps: GuideStep[] = [
  {
    kind: "PROJECT",
    title: "Create your project account",
    description: "Deploy a FrameVibe account, verifier, and sponsor manager for this chain.",
    targetId: "create-project",
    action: "Create project"
  },
  {
    kind: "SPONSOR_RULE",
    title: "Configure sponsorship",
    description: "Set a simple gas sponsorship rule so APPROVE frames can consume an allowance.",
    targetId: "sponsor-manager",
    action: "Set sponsor rule"
  },
  {
    kind: "VERIFY",
    title: "Test VERIFY",
    description: "Validate the user or wallet lane and prove nonce protection works.",
    targetId: "frame-simulator",
    action: "Execute VERIFY"
  },
  {
    kind: "EXECUTION",
    title: "Test EXECUTION",
    description: "Run a safe manual call, such as a zero-value call to your own wallet.",
    targetId: "frame-simulator",
    action: "Execute call"
  },
  {
    kind: "APPROVE",
    title: "Test APPROVE",
    description: "Consume the sponsor rule and confirm the used counter increments.",
    targetId: "frame-simulator",
    action: "Execute APPROVE"
  }
];

function scrollToPanel(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function GuidedSetup({ chainId }: Props) {
  const [entries, setEntries] = useState<ReceiptEntry[]>([]);

  useEffect(() => {
    function refresh() {
      setEntries(readReceiptTimeline());
    }

    refresh();
    window.addEventListener("framevibe:receipt-added", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("framevibe:receipt-added", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const chainEntries = useMemo(() => entries.filter((entry) => entry.chainId === chainId), [chainId, entries]);
  const completeKinds = useMemo(() => new Set(chainEntries.map((entry) => entry.kind)), [chainEntries]);
  const completedCount = steps.filter((step) => completeKinds.has(step.kind)).length;
  const nextStep = steps.find((step) => !completeKinds.has(step.kind));

  return (
    <section className="guided-panel" aria-label="Guided setup">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Guided Setup</p>
          <h3>Ship a Frame Flow Without Code</h3>
        </div>
        <span className={completedCount === steps.length ? "pill ready" : "pill"}>{completedCount}/{steps.length} complete</span>
      </div>

      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${(completedCount / steps.length) * 100}%` }} />
      </div>

      {nextStep ? (
        <div className="next-step">
          <span>Next</span>
          <strong>{nextStep.title}</strong>
          <p>{nextStep.description}</p>
          <button type="button" className="primary-action" onClick={() => scrollToPanel(nextStep.targetId)}>
            {nextStep.action}
          </button>
        </div>
      ) : (
        <div className="next-step done">
          <span>Ready</span>
          <strong>Frame flow validated</strong>
          <p>Your project has completed VERIFY, EXECUTION, APPROVE, and sponsorship setup on this chain.</p>
        </div>
      )}

      <div className="guide-steps">
        {steps.map((step, index) => {
          const done = completeKinds.has(step.kind);
          return (
            <button type="button" key={step.kind} className={done ? "guide-step done" : "guide-step"} onClick={() => scrollToPanel(step.targetId)}>
              <span>{done ? "✓" : index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{done ? "Completed" : step.description}</small>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
