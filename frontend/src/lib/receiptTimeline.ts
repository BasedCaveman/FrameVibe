export type ReceiptKind = "PROJECT" | "SPONSOR_RULE" | "VERIFY" | "EXECUTION" | "APPROVE";

export type ReceiptEntry = {
  id: string;
  chainId: number;
  kind: ReceiptKind;
  title: string;
  txHash: string;
  detail?: string;
  createdAt: string;
};

const storageKey = "framevibe:receipt-timeline:v1";

export function readReceiptTimeline(): ReceiptEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) as ReceiptEntry[] : [];
  } catch {
    return [];
  }
}

export function appendReceipt(entry: Omit<ReceiptEntry, "id" | "createdAt">) {
  if (typeof window === "undefined") return [];

  const nextEntry: ReceiptEntry = {
    ...entry,
    id: `${entry.chainId}:${entry.kind}:${entry.txHash}`,
    createdAt: new Date().toISOString()
  };
  const next = [nextEntry, ...readReceiptTimeline().filter((item) => item.id !== nextEntry.id)].slice(0, 50);
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("framevibe:receipt-added"));
  return next;
}

export function clearReceiptTimeline(chainId?: number) {
  if (typeof window === "undefined") return [];

  const next = typeof chainId === "number" ? readReceiptTimeline().filter((item) => item.chainId !== chainId) : [];
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("framevibe:receipt-added"));
  return next;
}
