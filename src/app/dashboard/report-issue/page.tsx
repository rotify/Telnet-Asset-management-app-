"use client";

import { useState } from "react";
import { submitMaintenanceRequest } from "@/lib/api";
import { StaffPageShell } from "@/components/layout/staff-page-shell";

const inputClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-telnet-primary focus:outline-none";

export default function ReportIssuePage() {
  const [asset, setAsset] = useState("");
  const [issue, setIssue] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSent(false);
    if (!asset.trim() || !issue.trim()) {
      setError("Describe the asset and the issue.");
      return;
    }
    setIsSending(true);
    try {
      await submitMaintenanceRequest(
        { asset_description: asset.trim(), issue_description: issue.trim() },
        photo
      );
      setAsset("");
      setIssue("");
      setPhoto(null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the request.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <StaffPageShell
      title="Report an Issue"
      description="Send an emergency maintenance request to the admin team."
    >
      <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
        <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
          Request Details
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
              Asset
            </label>
            <input
              type="text"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              placeholder="E.g Toyota Hilux LND-123AB, or Dell laptop"
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
              What&apos;s wrong?
            </label>
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={4}
              placeholder="Describe the problem and anything that makes it urgent"
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
              Photo (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
            />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {sent && (
          <p className="mt-3 text-sm text-green-600">
            Request sent. The admin team has been notified.
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSending}
          className="mt-4 rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60"
        >
          {isSending ? "Sending…" : "Send Request"}
        </button>
      </div>
    </StaffPageShell>
  );
}
