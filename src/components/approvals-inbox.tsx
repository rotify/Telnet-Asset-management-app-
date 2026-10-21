"use client";

import { useEffect, useState } from "react";
import {
  approveApproval,
  getAssetAssignmentRequest,
  getDriverRequest,
  getPendingApprovals,
  rejectApproval,
} from "@/lib/api";
import { fmtWhen, requestWindow } from "@/lib/driver-requests";
import type { ApprovalRecord, AssetAssignmentRequest, DriverRequest } from "@/types/workflow";

interface Item {
  record: ApprovalRecord;
  driver?: DriverRequest;
  assign?: AssetAssignmentRequest;
}

const APPROVER_LABEL: Record<string, string> = {
  supervisor: "As supervisor",
  reporting_manager: "As reporting manager",
  admin: "Admin fallback",
  vehicle_manager: "As vehicle manager",
  equipment_manager: "As equipment manager",
};

// Everything waiting on the signed-in person: asset assignments (reporting
// manager and supervisor) and driver requests (designated approver). Used by
// staff, managers and admins, since anyone can be someone's approver.
export function ApprovalsInbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const records = await getPendingApprovals();
      const detailed = await Promise.all(
        records.map(async (record): Promise<Item> => {
          try {
            if (record.driver_request ?? (record.target_type === "driver_request" ? record.target_id : null)) {
              return { record, driver: await getDriverRequest(record.driver_request ?? record.target_id) };
            }
            const id = record.asset_assignment_request ?? record.target_id;
            return { record, assign: await getAssetAssignmentRequest(id) };
          } catch {
            return { record };
          }
        })
      );
      setItems(detailed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load approvals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(it: Item, action: "approve" | "reject") {
    let note = "";
    if (action === "reject") {
      const reason = window.prompt("Reason for rejecting (shown to the requester):");
      if (reason === null) return;
      note = reason.trim();
    } else if (!window.confirm("Approve this request?")) {
      return;
    }
    setBusy(it.record.id);
    setError(null);
    try {
      if (action === "approve") await approveApproval(it.record.id);
      else await rejectApproval(it.record.id, note);
      setItems((prev) => prev.filter((x) => x.record.id !== it.record.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record your decision.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {loading && <p className="mt-6 text-sm text-slate-500">Loading approvals…</p>}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          Nothing is waiting for your approval.
        </p>
      )}
      <div className="mt-4 space-y-2">
        {items.map((it) => {
          const r = it.record;
          const isDriver = r.target_type === "driver_request";
          return (
            <div key={r.id} className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {isDriver ? "Driver request" : "Asset assignment"} ·{" "}
                    {APPROVER_LABEL[r.approver_type] ?? r.approver_type}
                  </p>
                  {isDriver ? (
                    <>
                      <p className="mt-1 font-semibold text-slate-800">
                        {it.driver?.requested_by_name ?? `Request #${r.target_id}`}
                      </p>
                      {it.driver && (
                        <>
                          <p className="text-sm text-slate-600">{it.driver.details || "Driver request"}</p>
                          <p className="text-xs text-slate-500">{requestWindow(it.driver)}</p>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="mt-1 font-semibold text-slate-800">
                        Asset #{it.assign?.asset ?? r.asset_assignment_request ?? r.target_id}
                      </p>
                      {it.assign && (
                        <p className="text-sm text-slate-600">
                          Staff #{it.assign.previous_staff ?? "none"} → Staff #{it.assign.requested_staff ?? "?"}
                        </p>
                      )}
                    </>
                  )}
                  <p className="mt-1 text-xs text-slate-400">Requested {fmtWhen(r.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => decide(it, "approve")}
                    className="rounded-lg bg-telnet-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => decide(it, "reject")}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
