"use client";

import { useEffect, useState } from "react";
import { getDriverRequests, reviewDriverRequest } from "@/lib/api";
import { ManagerPageShell } from "@/components/layout/manager-page-shell";
import { StatusDot } from "@/components/status-dot";
import { DR_TONE, drLabel, fmtWhen, requestWindow } from "@/lib/driver-requests";
import { useManagerContext } from "@/lib/manager";
import type { DriverRequest } from "@/types/workflow";

function DriverRequestApprovals() {
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    getDriverRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load requests."))
      .finally(() => setLoading(false));
  }, []);

  async function review(r: DriverRequest, action: "approve" | "reject") {
    let note: string | undefined;
    if (action === "reject") {
      const reason = window.prompt("Reason for rejecting (shown to the requester):");
      if (reason === null) return;
      note = reason.trim() || undefined;
    }
    setBusy(r.id);
    setError(null);
    try {
      const updated = await reviewDriverRequest(r.id, action, note);
      setRequests((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...updated } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the request.");
    } finally {
      setBusy(null);
    }
  }

  const pending = requests.filter((r) => r.status === "requested");
  const history = requests.filter((r) => r.status !== "requested");

  return (
    <>
      {loading && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <h2 className="mt-6 text-lg font-bold text-[#121B3B]">Waiting for your approval ({pending.length})</h2>
      {!loading && pending.length === 0 && (
        <p className="mt-3 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          No driver requests need approval.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {pending.map((r) => (
          <div key={r.id} className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{r.requested_by_name ?? "Staff member"}</p>
                <p className="mt-0.5 text-sm text-slate-600">{r.details || "Driver request"}</p>
                <p className="mt-0.5 text-xs text-slate-500">{requestWindow(r)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => review(r, "approve")}
                  className="rounded-lg bg-telnet-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => review(r, "reject")}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-bold text-[#121B3B]">Decided</h2>
          <div className="mt-3 space-y-2">
            {history.map((r) => (
              <div key={r.id} className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{r.requested_by_name ?? "Staff member"}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{r.details || "Driver request"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {requestWindow(r)}
                      {r.approved_at ? ` · approved ${fmtWhen(r.approved_at)}` : ""}
                    </p>
                  </div>
                  <StatusDot label={drLabel(r.status)} tone={DR_TONE[r.status] ?? "slate"} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="mt-6 text-xs text-slate-400">
        Admins assign the driver and vehicle once a request is approved.
      </p>
    </>
  );
}

export default function ManagerApprovalsPage() {
  const { type } = useManagerContext();
  return (
    <ManagerPageShell
      title="Approvals"
      description={
        type === "vehicles"
          ? "Driver requests waiting for you, alongside the requester's reporting manager."
          : "Asset assignment requests waiting for you, alongside the supervisor and reporting manager."
      }
    >
      {type === "vehicles" ? (
        <DriverRequestApprovals />
      ) : (
        <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          Asset assignment approvals will appear here once the backend can list and decide them.
          Nothing is waiting right now.
        </p>
      )}
    </ManagerPageShell>
  );
}
