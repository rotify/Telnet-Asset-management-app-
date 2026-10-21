"use client";

import { useEffect, useState } from "react";
import {
  assignDriverRequest,
  getDriverRequests,
  getStaff,
} from "@/lib/api";
import { requestWindow } from "@/lib/driver-requests";
import type { Staff } from "@/types/staff";
import type { DriverRequest } from "@/types/workflow";

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none";

// Approved driver requests waiting for the vehicle manager to assign a
// driver (dispatch).
export function DispatchQueue() {
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<DriverRequest | null>(null);
  const [driver, setDriver] = useState("");
  const [notes, setNotes] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDriverRequests()
      .then((all) => setRequests(all.filter((r) => r.status === "approved")))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load requests."))
      .finally(() => setLoading(false));
  }, []);

  async function open(r: DriverRequest) {
    setActive(r);
    setDriver("");
    setNotes("");
    setDialogError(null);
    const s = await getStaff().catch(() => [] as Staff[]);
    setStaff(s.filter((x) => x.is_active));
  }

  async function confirm() {
    if (!active) return;
    if (!driver) {
      setDialogError("Choose a driver.");
      return;
    }
    setSaving(true);
    setDialogError(null);
    try {
      await assignDriverRequest(active.id, {
        assigned_driver: Number(driver),
        notes: notes.trim() || undefined,
      });
      setRequests((prev) => prev.filter((r) => r.id !== active.id));
      setActive(null);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Couldn't assign.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h2 className="mt-8 text-lg font-bold text-[#121B3B]">Ready to dispatch ({requests.length})</h2>
      <p className="mt-1 text-sm text-slate-500">
        Approved driver requests. Assign a driver.
      </p>
      {loading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {!loading && !error && requests.length === 0 && (
        <p className="mt-3 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          No approved requests are waiting.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{r.requested_by_name ?? "Staff member"}</p>
                <p className="text-sm text-slate-600">{r.details || "Driver request"}</p>
                <p className="text-xs text-slate-500">{requestWindow(r)}</p>
              </div>
              <button
                type="button"
                onClick={() => open(r)}
                className="rounded-lg bg-[#0F172A] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1e293b]"
              >
                Assign driver
              </button>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#121B3B]">Assign driver</h3>
            <p className="mt-1 text-sm text-slate-500">
              {active.requested_by_name}: {requestWindow(active)}
            </p>
            <div className="mt-4 space-y-3">
              {staff.length > 0 ? (
                <select value={driver} onChange={(e) => setDriver(e.target.value)} className={field}>
                  <option value="">Select a driver</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.staff_id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  placeholder="Driver's staff record ID"
                  className={field}
                />
              )}
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className={field}
              />
            </div>
            {dialogError && <p className="mt-3 text-sm text-red-600">{dialogError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={saving}
                className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
