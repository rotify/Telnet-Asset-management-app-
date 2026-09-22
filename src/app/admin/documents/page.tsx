"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import {
  createDocumentWithFile,
  deleteDocument,
  documentFileUrl,
  getDocuments,
  updateDocument,
  updateDocumentWithFile,
} from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import type { DocumentRecord } from "@/types/document";

type DocStatus = "Valid" | "Expiring" | "Expired" | "Unknown";

const STATUS_TONES: Record<DocStatus, StatusTone> = {
  Valid: "green",
  Expiring: "orange",
  Expired: "red",
  Unknown: "slate",
};

const DOCUMENT_TYPE_OPTIONS = [
  "insurance",
  "license",
  "warranty",
  "receipt",
]


function prettifyDocumentType(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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
      <path d="M3 8a2 2 0 0 1 2-2h11l5 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M15 12h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3a2 2 0 0 1 0-4Z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="3" width="14" height="18" rx="2" />
      <path d="M14 14h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1 0-4Z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
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

const EMPTY_EDIT_DOC = {
  name: "",
  document_type: "",
  description: "",
  issuing_authority: "",
  issue_date: "",
  expiry_date: "",
  document_number: "",
  location: "",
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
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDoc, setEditDoc] = useState(EMPTY_EDIT_DOC);
  const [editDocFile, setEditDocFile] = useState<File | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx";

  function validateFile(file: File | null): string | null {
    if (!file) return null;
    const ok = /\.(pdf|docx?)$/i.test(file.name);
    if (!ok) return "Only PDF, DOC, or DOCX files are allowed.";
    return null;
  }

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
    const fileError = validateFile(newDocFile);
    if (fileError) {
      setAddError(fileError);
      return;
    }
    setIsAdding(true);
    try {
      const created = await createDocumentWithFile(newDoc, newDocFile);
      setDocuments((prev) => [created, ...prev]);
      setNewDoc(EMPTY_NEW_DOC);
      setNewDocFile(null);
      setShowAddForm(false);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Couldn't create document."
      );
    } finally {
      setIsAdding(false);
    }
  }

  function startEdit(doc: DocumentRecord) {
    setEditingId(doc.id);
    setEditDoc({
      name: doc.name ?? "",
      document_type: doc.document_type ?? "",
      description: doc.description ?? "",
      issuing_authority: doc.issuing_authority ?? "",
      issue_date: doc.issue_date ?? "",
      expiry_date: doc.expiry_date ?? "",
      document_number: doc.document_number ?? "",
      location: doc.location ?? "",
    });
    setEditDocFile(null);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDocFile(null);
    setEditError(null);
  }

  async function saveEdit() {
    if (editingId == null) return;
    setEditError(null);
    if (!editDoc.name.trim() || !editDoc.document_type.trim()) {
      setEditError("Name and document type are required.");
      return;
    }
    const fileError = validateFile(editDocFile);
    if (fileError) {
      setEditError(fileError);
      return;
    }
    setIsSavingEdit(true);
    try {
      const updated = editDocFile
        ? await updateDocumentWithFile(editingId, editDoc, editDocFile)
        : await updateDocument(editingId, editDoc);
      setDocuments((prev) =>
        prev.map((d) => (d.id === editingId ? updated : d))
      );
      setEditingId(null);
      setEditDocFile(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Couldn't update document."
      );
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteDocument(id: number, label: string) {
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Couldn't delete document."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleExport() {
    const rows = [
      ["Name", "Type", "Status", "Expiry Date", "Uploaded By"],
      ...documents.map((doc) => [
        doc.name,
        doc.document_type,
        statusFromExpiry(doc.expiry_date),
        doc.expiry_date ?? "",
        doc.responsible_person ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documents.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-6 py-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          {/* Sticky so the search/date/profile bar stays put while the
              page content below scrolls, matching the sidebar's fixed
              positioning instead of scrolling away with the page. */}
          <div className="sticky top-0 z-20 bg-[#EFF1F6] pb-2">
            <AdminTopBar />
          </div>

          <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">
                Document Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Store and manage important company files such as insurance
                certificates, licenses, warranties, and receipts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <ExportIcon />
                Export
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm((v) => !v);
                  setAddError(null);
                  setNewDocFile(null);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b]"
              >
                {showAddForm ? null : <UploadIcon />}
                {showAddForm ? "Cancel" : "Upload"}
              </button>
            </div>
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
                <select
                  value={newDoc.document_type}
                  onChange={(e) =>
                    setNewDoc((v) => ({ ...v, document_type: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                >
                  <option value="">Select document type</option>
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {prettifyDocumentType(opt)}
                    </option>
                  ))}
                </select>
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
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={newDoc.issue_date}
                    onChange={(e) =>
                      setNewDoc((v) => ({ ...v, issue_date: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newDoc.expiry_date}
                    onChange={(e) =>
                      setNewDoc((v) => ({ ...v, expiry_date: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Description"
                  value={newDoc.description}
                  onChange={(e) =>
                    setNewDoc((v) => ({ ...v, description: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <div className="sm:col-span-3">
                  <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
                    File (PDF, DOC, or DOCX)
                  </label>
                  <input
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={(e) =>
                      setNewDocFile(e.target.files?.[0] ?? null)
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {newDocFile && (
                    <p className="mt-1 text-xs text-slate-400">
                      {newDocFile.name}
                    </p>
                  )}
                </div>
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

          <div className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)] sm:flex-row sm:items-center">
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
                placeholder="Search…"
                className="w-full rounded-lg border-0 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-telnet-primary"
              />
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <CalendarIcon />
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
                    className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-telnet-activeBg text-[#222222]">
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
                        <span className="text-slate-400">Expiring Date</span>
                        <span className="font-medium text-slate-700">
                          {formatDate(doc.expiry_date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Uploaded By</span>
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

                    {editingId === doc.id && (
                      <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                        <p className="text-sm font-semibold text-[#121B3B]">
                          Edit document
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <input
                            type="text"
                            placeholder="Document name"
                            value={editDoc.name}
                            onChange={(e) =>
                              setEditDoc((v) => ({
                                ...v,
                                name: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                          />
                          <select
                            value={editDoc.document_type}
                            onChange={(e) =>
                              setEditDoc((v) => ({
                                ...v,
                                document_type: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                          >
                            <option value="">Select document type</option>
                            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {prettifyDocumentType(opt)}
                              </option>
                            ))}
                            {editDoc.document_type &&
                              !DOCUMENT_TYPE_OPTIONS.includes(
                                editDoc.document_type
                              ) && (
                                <option value={editDoc.document_type}>
                                  {prettifyDocumentType(editDoc.document_type)}
                                </option>
                              )}
                          </select>
                          <input
                            type="text"
                            placeholder="Issuing authority"
                            value={editDoc.issuing_authority}
                            onChange={(e) =>
                              setEditDoc((v) => ({
                                ...v,
                                issuing_authority: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Document number"
                            value={editDoc.document_number}
                            onChange={(e) =>
                              setEditDoc((v) => ({
                                ...v,
                                document_number: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                          />
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-500">
                              Issue Date
                            </label>
                            <input
                              type="date"
                              value={editDoc.issue_date}
                              onChange={(e) =>
                                setEditDoc((v) => ({
                                  ...v,
                                  issue_date: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-500">
                              Expiry Date
                            </label>
                            <input
                              type="date"
                              value={editDoc.expiry_date}
                              onChange={(e) =>
                                setEditDoc((v) => ({
                                  ...v,
                                  expiry_date: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Location"
                            value={editDoc.location}
                            onChange={(e) =>
                              setEditDoc((v) => ({
                                ...v,
                                location: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={editDoc.description}
                            onChange={(e) =>
                              setEditDoc((v) => ({
                                ...v,
                                description: e.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                          />
                          <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-xs font-medium text-slate-500">
                              Replace file (optional)
                            </label>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) =>
                                setEditDocFile(e.target.files?.[0] ?? null)
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                            />
                            {editDocFile && (
                              <p className="mt-1 text-xs text-slate-400">
                                {editDocFile.name}
                              </p>
                            )}
                          </div>
                        </div>
                        {editError && (
                          <p className="text-sm text-red-600">{editError}</p>
                        )}
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={isSavingEdit}
                            className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
                          >
                            {isSavingEdit ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-sm font-medium text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteDocument(doc.id, doc.name)
                            }
                            disabled={deletingId === doc.id}
                            className="ml-auto text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                          >
                            {deletingId === doc.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-6 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : doc.id)
                        }
                        className="flex items-center gap-1.5 text-sm font-medium text-[#121B3B] hover:text-telnet-primary"
                      >
                        <EyeIcon />
                        {isExpanded ? "Hide Details" : "View Details"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editingId === doc.id ? cancelEdit() : startEdit(doc)
                        }
                        className="flex items-center gap-1.5 text-sm font-medium text-[#121B3B] hover:text-telnet-primary"
                      >
                        <EditIcon />
                        {editingId === doc.id ? "Close" : "Edit"}
                      </button>
                      {doc.document_file ? (
                        <a
                          href={documentFileUrl(doc.document_file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm font-medium text-[#121B3B] hover:text-telnet-primary"
                        >
                          <ExportIcon />
                          View File
                        </a>
                      ) : (
                        <span
                          title="No file has been uploaded for this document"
                          className="flex items-center gap-1.5 text-sm font-medium text-slate-300"
                        >
                          <ExportIcon />
                          No File
                        </span>
                      )}
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
