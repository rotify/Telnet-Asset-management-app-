import type { StatusTone } from "@/components/status-dot";
import type { DriverRequest } from "@/types/workflow";

export const DR_TONE: Record<string, StatusTone> = {
  requested: "orange",
  approved: "navy",
  assigned: "green",
  rejected: "red",
  cancelled: "red",
  completed: "slate",
};

export function drLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function requestWindow(r: DriverRequest): string {
  if (r.requested_start && r.requested_end)
    return `${fmtWhen(r.requested_start)} → ${fmtWhen(r.requested_end)}`;
  return r.preferred_date ?? "—";
}

// <input type="datetime-local"> value -> ISO string
export function toIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
