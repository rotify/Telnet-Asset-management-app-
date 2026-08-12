"use client";

import { useState } from "react";
import { assignAsset, getAssetHistory, releaseAsset } from "@/lib/api";
import type { AssetHistoryEntry } from "@/types/maintenance";

interface StaffOption {
  id: number;
  name: string;
}

interface AssetActionsProps {
  assetId: number;
  staffOptions: StaffOption[];
  onChanged?: () => void;
}

function formatTimestamp(value: unknown): string {
  if (typeof value !== "string") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB");
}

export function AssetActions({
  assetId,
  staffOptions,
  onChanged,
}: AssetActionsProps) {
  const [mode, setMode] = useState<"idle" | "assigning">("idle");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<AssetHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  async function handleConfirmAssign() {
    if (!selectedStaff) {
      setError("Pick a staff member first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await assignAsset(assetId, Number(selectedStaff));
      setMode("idle");
      setSelectedStaff("");
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't assign asset.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    if (!window.confirm("Release this asset from its current assignee?")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await releaseAsset(assetId);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't release asset.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleHistory() {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    setHistoryOpen(true);
    if (history) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getAssetHistory(assetId);
      setHistory(data);
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "Couldn't load history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="align-top text-xs">
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("assigning")}
            className="font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
          >
            Assign
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleRelease}
            className="font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
          >
            {busy ? "…" : "Release"}
          </button>
          <button
            type="button"
            onClick={handleToggleHistory}
            className="font-medium text-slate-500 hover:text-slate-700"
          >
            {historyOpen ? "Hide History" : "History"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 text-xs focus:border-blue-600 focus:outline-none"
          >
            <option value="">Select staff…</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirmAssign}
            className="font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("idle");
              setError(null);
            }}
            className="font-medium text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-red-600">{error}</p>}

      {historyOpen && (
        <div className="mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          {historyLoading && <p className="text-slate-400">Loading…</p>}
          {historyError && <p className="text-red-600">{historyError}</p>}
          {!historyLoading && !historyError && history && history.length === 0 && (
            <p className="text-slate-400">No history recorded yet.</p>
          )}
          {!historyLoading && !historyError && history && history.length > 0 && (
            <ul className="space-y-1">
              {history.map((h) => (
                <li key={h.id} className="border-b border-slate-50 pb-1 last:border-0">
                  <span className="font-medium text-slate-700">
                    {String(h.action ?? "Action")}
                  </span>
                  {h.staff_name ? (
                    <span className="text-slate-500"> — {String(h.staff_name)}</span>
                  ) : null}
                  {h.timestamp ? (
                    <div className="text-slate-400">
                      {formatTimestamp(h.timestamp)}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
