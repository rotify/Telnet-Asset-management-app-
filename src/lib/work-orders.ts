import type { WorkOrder } from "@/types/work-order";

const CLOSED = ["completed", "closed", "done", "resolved", "cancelled"];

export function isOpenWorkOrder(o: WorkOrder): boolean {
  return !CLOSED.includes((o.status ?? "").toLowerCase());
}

export function workOrderTitle(o: WorkOrder): string {
  const type = (o.work_type ?? "work order").replace(/_/g, " ");
  return `${o.equipment_name || `Equipment #${o.equipment}`} ${type}`;
}

export function prettify(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// critical = high priority or overdue, warning = medium, info = rest.
export function workOrderLevel(o: WorkOrder): "critical" | "warning" | "info" {
  const p = (o.priority ?? "").toLowerCase();
  const overdue =
    !!o.due_date && new Date(o.due_date).getTime() < Date.now() - 86400000;
  if (p === "high" || p === "urgent" || p === "critical" || overdue)
    return "critical";
  if (p === "medium") return "warning";
  return "info";
}
