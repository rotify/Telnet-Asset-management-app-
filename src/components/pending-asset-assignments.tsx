"use client";

import { useEffect, useState } from "react";
import {
  approveAssetAssignment,
  getPendingAssetAssignments,
  rejectAssetAssignment,
} from "@/lib/api";
import type { AssetAssignmentRequest } from "@/types/workflow";

// Every asset-assignment request still waiting for approval, with approve
// and reject for the signed-in person (the admin acts as the fallback).
export function PendingAssetAssignments() {
  const [rows, setRows] = useState<AssetAssignmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    getPendingAssetAssignments()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load requests."))
      .finally(() => setLoading(false));
  }, []);

  async function decide(r: AssetAssignmentRequest, action: "approve" | "reject") {
    let note = "";
    if (action === "reject") {
      const reason = window.prompt("Reason for rejecting:");
      if (reason === null) return;
      note = reason.trim();
    } else if (!window.confirm("Approve this assignment?")) {
      return;
    }
    setBusy(r.id);
    setError(null);
    try {
      const updated =
        action === "approve"
          ? await approveAssetAssignment(r.id)
          : await rejectAssetAssignment(r.id, note);
      const stillPending = action === "approve" && (updated?.status ?? "pending") === "pending";
      setRows((prev) =>
        stillPending
          ? prev.map((x) => (x.id === r.id ? { ...x, ...updated } : x))
          : prev.filter((x) => x.id !== r.id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record your decision.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h2 className="mt-8 text-lg font-bold text-[#121B3B]">
        Asset assignments awaiting approval ({rows.length})
      </h2>
      {loading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="mt-3 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          No asset assignments are waiting.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">Asset #{r.asset}</p>
                <p className="text-sm text-slate-600">
                  Staff #{r.previous_staff ?? "none"} → Staff #{r.requested_staff ?? "?"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => decide(r, "approve")}
                  className="rounded-lg bg-telnet-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => decide(r, "reject")}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
