import type { StatusTone } from "@/components/status-dot";

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((t - Date.now()) / 86_400_000);
}

// Green / orange (within 30 days) / red (past) for an expiry date.
export function expiryTone(value: string | null | undefined): StatusTone {
  const d = daysUntil(value);
  if (d === null) return "slate";
  if (d < 0) return "red";
  return d <= 30 ? "orange" : "green";
}

export function expiryLabel(value: string | null | undefined): string {
  const d = daysUntil(value);
  if (d === null) return "No date";
  if (d < 0) return `Expired ${fmtDate(value)}`;
  if (d === 0) return "Expires today";
  return `${fmtDate(value)} (${d}d)`;
}

export function statusTone(status: string | null | undefined): StatusTone {
  const s = (status ?? "").toLowerCase();
  if (["active", "valid", "good", "available"].includes(s)) return "green";
  if (["damaged", "expired", "inactive"].includes(s)) return "red";
  if (s.includes("pending") || s.includes("expir")) return "orange";
  return "slate";
}

export function prettyStatus(status: string | null | undefined): string {
  return (status ?? "—").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
