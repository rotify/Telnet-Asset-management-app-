"use client";

import { useEffect, useMemo, useState } from "react";
import { documentFileUrl } from "@/lib/api";
import { loadMyData } from "@/lib/my-assets";
import { StaffPageShell } from "@/components/layout/staff-page-shell";
import { StatusDot } from "@/components/status-dot";
import { DOC_TONES, docStatus, fmtDate, type DocStatus } from "@/lib/staff-helpers";
import type { DocumentRecord } from "@/types/document";

function DocIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8a2 2 0 0 1 2-2h11l5 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

export default function StaffDocumentsPage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | DocStatus>("All");

  useEffect(() => {
    loadMyData().then((d) => {
      setDocs(d.documents);
      if (!d.linked)
        setError(
          "We couldn't match your login to a staff profile, so no documents are shown. Ask an admin to link your account."
        );
      else if (d.errors.length)
        setError(`Couldn't load your ${d.errors.join(", ")}.`);
      setIsLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter(
      (d) =>
        (statusFilter === "All" || docStatus(d.expiry_date) === statusFilter) &&
        (!q ||
          [d.name, d.document_type, d.document_number ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q))
    );
  }, [docs, search, statusFilter]);

  return (
    <StaffPageShell
      title="My Documents"
      description="Licences, permits and certificates linked to you."
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search my documents..."
    >
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)] sm:flex-row sm:items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All" | DocStatus)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
        >
          <option value="All">Status: All</option>
          <option value="Valid">Status: Valid</option>
          <option value="Expiring">Status: Expiring</option>
          <option value="Expired">Status: Expired</option>
        </select>
        {(search || statusFilter !== "All") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
            }}
            className="text-sm font-semibold text-red-400 hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading documents…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400">No documents match your search.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          {filtered.map((doc) => {
            const status = docStatus(doc.expiry_date);
            return (
              <div
                key={doc.id}
                className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)] sm:p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-telnet-activeBg text-[#222222] sm:h-11 sm:w-11">
                      <DocIcon />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#121B3B] sm:text-base">
                        {doc.name}
                      </p>
                      <p className="text-xs text-slate-400 sm:text-sm">
                        {doc.document_type}
                      </p>
                    </div>
                  </div>
                  <StatusDot label={status} tone={DOC_TONES[status]} className="shrink-0" />
                </div>

                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expiring Date</span>
                    <span className="font-medium text-slate-700">
                      {fmtDate(doc.expiry_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Issue Date</span>
                    <span className="font-medium text-slate-700">
                      {fmtDate(doc.issue_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Document No.</span>
                    <span className="font-medium text-slate-700">
                      {doc.document_number || "—"}
                    </span>
                  </div>
                </div>

                {doc.document_file && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <a
                      href={documentFileUrl(doc.document_file)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-slate-600 hover:text-[#121B3B]"
                    >
                      View Details
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </StaffPageShell>
  );
}
