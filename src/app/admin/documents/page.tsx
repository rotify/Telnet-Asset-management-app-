"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { createDocument, getDocuments } from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import type { DocumentRecord } from "@/types/document";

type DocStatus = "Valid" | "Expiring" | "Expired" | "Unknown";

const STATUS_TONES: Record<DocStatus, StatusTone> = {
  Valid: "blue",
  Expiring: "amber",
  Expired: "red",
  Unknown: "slate",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB");
}

function statusFromExpiry(expiry: string | null): DocStatus {
  if (!expiry) return "Unknown";
  const target = new Date(expiry).getTime();
  if (Number.isNaN(target)) return "Unknown";
  const days = Math.ceil((target - Date.now()) / 86400000);
  if (days < 0) return "Expired";
  if (days <= 30) return "Expiring";
  return "Valid";
}

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
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 9h18M8 4v14" />
    </svg>
  );
}

const EMPTY_NEW_DOC = {
  name: "",
  document_type: "",
  description: "",
  issuing_authority: "",
  issue_date: "",
  expiry_date: "",
};

export default function DocumentsPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | DocStatus>("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoc, setNewDoc] = useState(EMPTY_NEW_DOC);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    const storedUsername = getStoredUsername();
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!isSuperAdmin(storedUsername)) {
      router.replace("/dashboard");
      return;
    }
    setGateChecked(true);
  }, [router]);

  async function loadDocuments() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load documents.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!gateChecked) return;
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateChecked]);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const status = statusFromExpiry(doc.expiry_date);
      const matchesStatus = statusFilter === "All" || status === statusFilter;
      const matchesSearch = doc.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [documents, search, statusFilter]);

  async function handleAddDocument() {
    setAddError(null);
    if (!newDoc.name.trim() || !newDoc.document_type.trim()) {
      setAddError("Name and document type are required.");
      return;
    }
    setIsAdding(true);
    try {
      const created = await createDocument(newDoc);
      setDocuments((prev) => [created, ...prev]);
      setNewDoc(EMPTY_NEW_DOC);
      setShowAddForm(false);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Couldn't create document."
      );
    } finally {
      setIsAdding(false);
    }
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">Documents</h1>
              <p className="mt-1 text-sm text-slate-500">
                Live certificates, licences, and warranties from the backend.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddForm((v) => !v);
                setAddError(null);
              }}
              className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover"
            >
              {showAddForm ? "Cancel" : "+ Add Document"}
            </button>
          </header>

          {showAddForm && (
            <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              <p className="text-sm font-semibold text-[#121B3B]">
                New document
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="Document name"
                  value={newDoc.name}
                  onChange={(e) =>
                    setNewDoc((v) => ({ ...v, name: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Type (e.g. compliance, licence)"
                  value={newDoc.document_type}
                  onChange={(e) =>
                    setNewDoc((v) => ({ ...v, document_type: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Issuing authority"
                  value={newDoc.issuing_authority}
                  onChange={(e) =>
                    setNewDoc((v) => ({
                      ...v,
                      issuing_authority: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <input
                  type="date"
                  placeholder="Issue date"
                  value={newDoc.issue_date}
                  onChange={(e) =>
                    setNewDoc((v) => ({ ...v, issue_date: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <input
                  type="date"
                  placeholder="Expiry date"
                  value={newDoc.expiry_date}
                  onChange={(e) =>
                    setNewDoc((v) => ({ ...v, expiry_date: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newDoc.description}
                  onChange={(e) =>
                    setNewDoc((v) => ({ ...v, description: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
              </div>
              {addError && (
                <p className="mt-2 text-sm text-red-600">{addError}</p>
              )}
              <button
                type="button"
                onClick={handleAddDocument}
                disabled={isAdding}
                className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
              >
                {isAdding ? "Saving…" : "Save document"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadDocuments}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-telnet-primary focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "All" | DocStatus)
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
            >
              <option value="All">Status: All</option>
              <option value="Valid">Status: Valid</option>
              <option value="Expiring">Status: Expiring</option>
              <option value="Expired">Status: Expired</option>
            </select>
          </div>

          {isLoading && !error && (
            <p className="mt-6 text-sm text-slate-500">Loading documents…</p>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <p className="mt-8 text-sm text-slate-400">
              No documents match your search.
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((doc) => {
                const status = statusFromExpiry(doc.expiry_date);
                const isExpanded = expandedId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="rounded-xl border-t-4 border-t-telnet-primary bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-telnet-primary">
                          <DocIcon />
                        </span>
                        <div>
                          <p className="font-semibold text-[#121B3B]">
                            {doc.name}
                          </p>
                          <p className="text-sm text-slate-400">
                            {doc.document_type}
                          </p>
                        </div>
                      </div>
                      <StatusDot
                        label={status}
                        tone={STATUS_TONES[status]}
                        className="shrink-0"
                      />
                    </div>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Expiry Date</span>
                        <span className="font-medium text-slate-700">
                          {formatDate(doc.expiry_date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Responsible Person
                        </span>
                        <span className="font-medium text-slate-700">
                          {doc.responsible_person || "—"}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">
                            Issuing Authority
                          </span>
                          <span className="font-medium text-slate-700">
                            {doc.issuing_authority || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Issue Date</span>
                          <span className="font-medium text-slate-700">
                            {formatDate(doc.issue_date)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">
                            Document Number
                          </span>
                          <span className="font-medium text-slate-700">
                            {doc.document_number || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Location</span>
                          <span className="font-medium text-slate-700">
                            {doc.location || "—"}
                          </span>
                        </div>
                        {doc.description && (
                          <p className="text-slate-500">{doc.description}</p>
                        )}
                        {doc.notes && (
                          <p className="text-slate-400">Notes: {doc.notes}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-5 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : doc.id)
                        }
                        className="text-sm font-medium text-slate-500 hover:text-telnet-primary"
                      >
                        {isExpanded ? "Hide Details" : "View Details"}
                      </button>
                      <span
                        title="No update/export endpoint on the API yet"
                        className="text-sm font-medium text-slate-300"
                      >
                        Edit
                      </span>
                      <span
                        title="No update/export endpoint on the API yet"
                        className="text-sm font-medium text-slate-300"
                      >
                        Export
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
