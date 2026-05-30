import { formatEther, parseEther } from "viem";

export function testEthToWei(value: string) {
  const normalized = value.trim() || "0";
  return parseEther(normalized).toString();
}

export function weiToTestEth(value: string) {
  try {
    return formatEther(BigInt(value || "0"));
  } catch {
    return "0";
  }
}

export function minutesFromNowToTimestamp(minutes: string) {
  const value = Number(minutes || "0");
  if (!Number.isFinite(value) || value <= 0) return "0";
  return Math.floor(Date.now() / 1000 + value * 60).toString();
}

export function timestampToHelper(value: string) {
  if (!value || value === "0") return "Never expires";
  const date = new Date(Number(value) * 1000);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString();
}
