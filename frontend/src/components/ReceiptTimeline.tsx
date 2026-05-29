"use client";

import { useEffect, useMemo, useState } from "react";
import { clearReceiptTimeline, readReceiptTimeline, type ReceiptEntry } from "../lib/receiptTimeline";

type Props = {
  chainId: number;
};

export function ReceiptTimeline({ chainId }: Props) {
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

  return (
    <section className="timeline-panel" aria-label="Receipt timeline">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Receipts</p>
          <h3>Frame Timeline</h3>
        </div>
        <button type="button" className="secondary-action" onClick={() => clearReceiptTimeline(chainId)}>Clear chain</button>
      </div>

      {chainEntries.length > 0 ? (
        <div className="timeline-list">
          {chainEntries.map((entry) => (
            <article key={entry.id} className="timeline-item">
              <div>
                <span>{entry.kind}</span>
                <strong>{entry.title}</strong>
                {entry.detail ? <small>{entry.detail}</small> : null}
              </div>
              <code>{entry.txHash}</code>
              <time>{new Date(entry.createdAt).toLocaleString()}</time>
            </article>
          ))}
        </div>
      ) : (
        <p className="deploy-message">No receipts recorded for this chain yet.</p>
      )}
    </section>
  );
}
