"use client";

import { useEffect, useState } from "react";
import { getEquipmentWorkOrders } from "@/lib/api";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import {
  isOpenWorkOrder,
  prettify,
  workOrderLevel,
  workOrderTitle,
} from "@/lib/work-orders";
import type { WorkOrder } from "@/types/work-order";

const LEVEL_TONE: Record<string, StatusTone> = {
  critical: "red",
  warning: "orange",
  info: "slate",
};

// Shared card listing equipment work orders (auto-generated repair and
// certification jobs). Used on Notifications and Maintenance.
export function WorkOrdersPanel({
  title = "Equipment Work Orders",
  openOnly = false,
}: {
  title?: string;
  openOnly?: boolean;
}) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEquipmentWorkOrders()
      .then(setOrders)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Couldn't load work orders."
        )
      )
      .finally(() => setIsLoading(false));
  }, []);

  const shown = openOnly ? orders.filter(isOpenWorkOrder) : orders;

  return (
    <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
        {title}
        {!isLoading && !error && (
          <span className="ml-2 font-normal text-slate-400">
            ({shown.length})
          </span>
        )}
      </h2>
      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : shown.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No work orders.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {shown.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#121B3B]">
                  {workOrderTitle(o)}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {o.notes || "No notes"}
                  {o.due_date ? ` · Due ${o.due_date.slice(0, 10)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot
                  label={prettify(o.priority) || "Normal"}
                  tone={LEVEL_TONE[workOrderLevel(o)]}
                />
                <span className="text-xs text-slate-500">
                  {prettify(o.status)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
