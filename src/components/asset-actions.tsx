"use client";

import { useState } from "react";
import { assignAsset, getAssetHistory, releaseAsset } from "@/lib/api";
import type { AssetHistoryEntry } from "@/types/maintenance";
import { ThreeDotMenu, MenuItem } from "@/components/three-dot-menu";

interface StaffOption {
  id: number;
  name: string;
}

interface AssetActionsProps {
  assetId: number;
  staffOptions: StaffOption[];
  onChanged?: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  deleteConfirmLabel?: string;
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
  onEdit,
  onDelete,
  deleteConfirmLabel = "this record",
}: AssetActionsProps) {
  const [mode, setMode] = useState<"menu" | "assigning" | "history">("menu");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [history, setHistory] = useState<AssetHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  async function handleConfirmAssign(close: () => void) {
    if (!selectedStaff) {
      setError("Pick a staff member first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await assignAsset(assetId, Number(selectedStaff));
      setSelectedStaff("");
      setMode("menu");
      close();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't assign asset.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease(close: () => void) {
    if (!window.confirm("Release this asset from its current assignee?")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await releaseAsset(assetId);
      close();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't release asset.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(close: () => void) {
    if (!onDelete) return;
    if (
      !window.confirm(
        `Delete ${deleteConfirmLabel}? This can't be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      close();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete record.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleShowHistory() {
    setMode("history");
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
    <ThreeDotMenu>
      {(close) => {
        if (mode === "assigning") {
          return (
            <div className="p-2">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Assign to
              </p>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-telnet-primary focus:outline-none"
              >
                <option value="">
                  {staffOptions.length === 0 ? "No staff found" : "Select staff…"}
                </option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode("menu");
                    setError(null);
                  }}
                  className="text-sm font-medium text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleConfirmAssign(close)}
                  className="text-sm font-medium text-telnet-primary hover:text-telnet-primaryHover disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Confirm"}
                </button>
              </div>
            </div>
          );
        }

        if (mode === "history") {
          return (
            <div className="p-2">
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  History
                </p>
                <button
                  type="button"
                  onClick={() => setMode("menu")}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Back
                </button>
              </div>
              {historyLoading && (
                <p className="px-1 text-sm text-slate-400">Loading…</p>
              )}
              {historyError && (
                <p className="px-1 text-sm text-red-600">{historyError}</p>
              )}
              {!historyLoading &&
                !historyError &&
                history &&
                history.length === 0 && (
                  <p className="px-1 text-sm text-slate-400">
                    No history recorded yet.
                  </p>
                )}
              {!historyLoading &&
                !historyError &&
                history &&
                history.length > 0 && (
                  <ul className="max-h-56 space-y-1 overflow-y-auto">
                    {history.map((h) => (
                      <li
                        key={h.id}
                        className="border-b border-slate-50 px-1 py-1.5 text-sm last:border-0"
                      >
                        <span className="font-medium text-slate-700">
                          {String(h.action ?? "Action")}
                        </span>
                        {h.staff_name ? (
                          <span className="text-slate-500">
                            {" "}
                            — {String(h.staff_name)}
                          </span>
                        ) : null}
                        {h.timestamp ? (
                          <div className="text-xs text-slate-400">
                            {formatTimestamp(h.timestamp)}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          );
        }

        return (
          <div>
            {onEdit && <MenuItem onClick={onEdit}>Edit</MenuItem>}
            <MenuItem
              onClick={() => {
                setMode("assigning");
                setError(null);
              }}
            >
              Assign
            </MenuItem>
            <MenuItem onClick={() => handleRelease(close)} tone="danger">
              {busy ? "Releasing…" : "Release"}
            </MenuItem>
            <MenuItem onClick={handleShowHistory}>View History</MenuItem>
            {onDelete && (
              <MenuItem onClick={() => handleDelete(close)} tone="danger">
                {deleting ? "Deleting…" : "Delete"}
              </MenuItem>
            )}
            {error && (
              <p className="mt-1 px-3 text-xs text-red-600">{error}</p>
            )}
          </div>
        );
      }}
    </ThreeDotMenu>
  );
}
