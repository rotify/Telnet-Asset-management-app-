"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assignDriverRequest,
  createDriverRequest,
  getDriverRequests,
  getStaff,
} from "@/lib/api";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { prettify } from "@/lib/work-orders";
import type { Staff } from "@/types/staff";
import type { DriverRequest } from "@/types/workflow";

const TONE: Record<string, StatusTone> = {
  pending: "orange",
  assigned: "green",
  completed: "navy",
  cancelled: "red",
};

export default function DriverRequestsPage() {
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ details: "", preferred_date: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [driverId, setDriverId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([getDriverRequests(), getStaff().catch(() => [] as Staff[])])
      .then(([r, s]) => {
        setRequests(r);
        setStaff(s);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load requests.")
      )
      .finally(() => setIsLoading(false));
  }, []);

  const staffName = useMemo(
    () => new Map(staff.map((s) => [s.id, `${s.first_name} ${s.last_name}`])),
    [staff]
  );
  const drivers = staff.filter((s) => s.is_active);
  const text = (r: DriverRequest) => r.details || r.description || "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(
      (r) => !q || `${text(r)} ${r.status}`.toLowerCase().includes(q)
    );
  }, [requests, search]);

  async function handleCreate() {
    setFormError(null);
    if (!form.details.trim()) {
      setFormError("Please describe the request.");
      return;
    }
    setIsSaving(true);
    try {
      const created = await createDriverRequest({
        details: form.details.trim(),
        preferred_date: form.preferred_date || undefined,
      });
      setRequests((prev) => [created, ...prev]);
      setForm({ details: "", preferred_date: "" });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't submit.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssign(id: number) {
    if (!driverId) return;
    if (!window.confirm("Assign this driver to the request?")) return;
    try {
      const updated = await assignDriverRequest(id, {
        assigned_driver: Number(driverId),
        notes: notes.trim() || undefined,
      });
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      setAssigning(null);
      setDriverId("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't assign driver.");
    }
  }

  const input =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none";

  return (
    <AdminPageShell
      title="Driver Requests"
      description="Requests for a driver, from submission through manager review to assignment."
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search requests…"
      actions={
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b]"
        >
          {showForm ? "Cancel" : "+ New Request"}
        </button>
      }
    >
      {showForm && (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <textarea
              className={`${input} sm:col-span-2`}
              rows={2}
              placeholder="Request details"
              value={form.details}
              onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
            />
            <input
              type="date"
              className={input}
              value={form.preferred_date}
              onChange={(e) => setForm((f) => ({ ...f, preferred_date: e.target.value }))}
            />
          </div>
          {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleCreate}
            className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
          >
            {isSaving ? "Submitting…" : "Submit request"}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {isLoading && <p className="mt-6 text-sm text-slate-500">Loading requests…</p>}
      {!isLoading && !error && filtered.length === 0 && (
        <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          No driver requests found.
        </p>
      )}

      {filtered.length > 0 && (
        <div className="mt-6 space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{text(r) || `Request #${r.id}`}</p>
                  <p className="text-xs text-slate-400">
                    {r.preferred_date ? `Preferred ${r.preferred_date.slice(0, 10)}` : "No preferred date"}
                    {r.assigned_driver
                      ? ` · Driver: ${staffName.get(r.assigned_driver) ?? r.assigned_driver}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot label={prettify(r.status)} tone={TONE[r.status] ?? "slate"} />
                  {assigning !== r.id && (
                    <button
                      type="button"
                      onClick={() => setAssigning(r.id)}
                      className="text-sm font-medium text-telnet-primary hover:text-telnet-primaryHover"
                    >
                      {r.assigned_driver ? "Reassign" : "Assign driver"}
                    </button>
                  )}
                </div>
              </div>
              {assigning === r.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <select className={input} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                    <option value="">Select driver…</option>
                    {drivers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                      </option>
                    ))}
                  </select>
                  <input
                    className={`${input} flex-1`}
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => handleAssign(r.id)}
                    className="rounded-lg bg-telnet-primary px-3 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover"
                  >
                    Assign
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssigning(null)}
                    className="text-sm font-medium text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
