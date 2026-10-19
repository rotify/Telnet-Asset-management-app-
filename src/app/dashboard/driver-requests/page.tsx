"use client";

import { useEffect, useState } from "react";
import { createDriverRequest, getCurrentUser, getDriverRequests } from "@/lib/api";
import { StaffPageShell } from "@/components/layout/staff-page-shell";
import { StatusDot } from "@/components/status-dot";
import { DR_TONE, drLabel, requestWindow, toIso } from "@/lib/driver-requests";
import type { DriverRequest } from "@/types/workflow";

const inputClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-telnet-primary focus:outline-none";

export default function RequestDriverPage() {
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ details: "", start: "", end: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    Promise.all([getDriverRequests(), getCurrentUser().catch(() => null)])
      .then(([all, me]) => {
        // The backend may return everyone's requests; show only mine.
        const mine =
          me?.id != null && all.some((r) => r.requester_user != null)
            ? all.filter((r) => r.requester_user === me.id)
            : all;
        setRequests(mine);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load requests.")
      )
      .finally(() => setIsLoading(false));
  }, []);

  async function submit() {
    setFormError(null);
    setSent(false);
    if (!form.details.trim()) {
      setFormError("Say what the driver is needed for.");
      return;
    }
    if (!form.start || !form.end) {
      setFormError("Choose a start and end time.");
      return;
    }
    if (new Date(form.end) <= new Date(form.start)) {
      setFormError("The end time must be after the start time.");
      return;
    }
    setIsSending(true);
    try {
      const created = await createDriverRequest({
        details: form.details.trim(),
        preferred_date: form.start.slice(0, 10),
        requested_start: toIso(form.start),
        requested_end: toIso(form.end),
      });
      setRequests((prev) => [created, ...prev]);
      setForm({ details: "", start: "", end: "" });
      setSent(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't send the request.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <StaffPageShell
      title="Request a Driver"
      description="Ask for a driver and vehicle. Your request is reviewed before one is assigned."
    >
      <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
        <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
          New Request
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">Details</label>
            <textarea
              rows={3}
              value={form.details}
              onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
              placeholder="Where are you going and why?"
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">Start</label>
            <input
              type="datetime-local"
              value={form.start}
              onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">End</label>
            <input
              type="datetime-local"
              value={form.end}
              onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
              className={inputClasses}
            />
          </div>
        </div>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
        {sent && (
          <p className="mt-3 text-sm text-green-600">
            Request sent. You&apos;ll see its status below once it&apos;s reviewed.
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={isSending}
          className="mt-4 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
        >
          {isSending ? "Sending…" : "Submit Request"}
        </button>
      </div>

      <h2 className="mt-8 text-lg font-bold text-[#121B3B]">My Requests</h2>
      {isLoading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {!isLoading && !error && requests.length === 0 && (
        <p className="mt-3 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          You haven&apos;t requested a driver yet.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {requests.map((r) => (
          <div
            key={r.id}
            className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{r.details || "Driver request"}</p>
                <p className="mt-0.5 text-xs text-slate-500">{requestWindow(r)}</p>
              </div>
              <StatusDot label={drLabel(r.status)} tone={DR_TONE[r.status] ?? "slate"} />
            </div>
            {r.status === "rejected" && r.rejection_note && (
              <p className="mt-2 text-xs text-red-600">Reason: {r.rejection_note}</p>
            )}
            {r.status === "assigned" && r.assigned_driver_name && (
              <p className="mt-2 text-xs text-slate-600">Driver: {r.assigned_driver_name}</p>
            )}
          </div>
        ))}
      </div>
    </StaffPageShell>
  );
}
