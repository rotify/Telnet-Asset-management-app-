"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

type DocStatus = "Valid" | "Expiring" | "Expired";

interface DocRecord {
  id: string;
  title: string;
  type: string;
  status: DocStatus;
  expiringDate: string;
  uploadedBy: string;
}

// Sample data — there's no documents API yet, so this stands in for
// GET /api/documents/ until the backend adds it. Shape mirrors the Figma
// design: title, type, status, expiring date, uploaded by.
const MOCK_DOCUMENTS: DocRecord[] = [
  {
    id: "doc-1",
    title: "Road Worthiness _ ABJ - 118- XA",
    type: "Certificate",
    status: "Expiring",
    expiringDate: "08/12/2026",
    uploadedBy: "Grace Adeyemi",
  },
  {
    id: "doc-2",
    title: "Business Operating Licence",
    type: "Licence",
    status: "Expiring",
    expiringDate: "08/12/2027",
    uploadedBy: "John Okoro",
  },
  {
    id: "doc-3",
    title: "Insurance Certificate",
    type: "Licence",
    status: "Valid",
    expiringDate: "18/10/2027",
    uploadedBy: "John Okoro",
  },
  {
    id: "doc-4",
    title: "Forklift Warranty",
    type: "Warranty",
    status: "Expired",
    expiringDate: "02/10/2026",
    uploadedBy: "Adekanbi Moses",
  },
  {
    id: "doc-5",
    title: "Fire Safety Certificate",
    type: "Certificate",
    status: "Valid",
    expiringDate: "14/03/2027",
    uploadedBy: "Grace Adeyemi",
  },
  {
    id: "doc-6",
    title: "Generator Maintenance Warranty",
    type: "Warranty",
    status: "Expiring",
    expiringDate: "30/08/2026",
    uploadedBy: "John Okoro",
  },
];

const STATUS_STYLES: Record<DocStatus, string> = {
  Valid: "bg-green-100 text-green-700",
  Expiring: "bg-amber-100 text-amber-700",
  Expired: "bg-red-100 text-red-700",
};

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

function ActionIcon({ name }: { name: "eye" | "pencil" | "download" }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "eye") {
    return (
      <svg {...common}>
        <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (name === "pencil") {
    return (
      <svg {...common}>
        <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />
    </svg>
  );
}

function ActionButton({
  icon,
  label,
}: {
  icon: "eye" | "pencil" | "download";
  label: string;
}) {
  return (
    <button
      type="button"
      title="No documents API yet — this is a placeholder action"
      className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600"
    >
      <ActionIcon name={icon} />
      {label}
    </button>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | DocStatus>("All");

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

  const filtered = useMemo(() => {
    return MOCK_DOCUMENTS.filter((doc) => {
      const matchesStatus = statusFilter === "All" || doc.status === statusFilter;
      const matchesSearch = doc.title
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter]);

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <header>
            <h1 className="text-2xl font-bold text-[#121B3B]">Documents</h1>
            <p className="mt-1 text-sm text-slate-500">
              Certificates, licences, and warranties across the company.
            </p>
          </header>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            The backend hasnt given a documents endpoint yet so the
            cards below are sample data matching the design so you can review
            the layout. Search and the status filter work against this
            sample set.
          </div>

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
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "All" | DocStatus)
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              <option value="All">Status: All</option>
              <option value="Valid">Status: Valid</option>
              <option value="Expiring">Status: Expiring</option>
              <option value="Expired">Status: Expired</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-8 text-sm text-slate-400">
              No documents match your search.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border-t-4 border-t-blue-600 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <DocIcon />
                      </span>
                      <div>
                        <p className="font-semibold text-[#121B3B]">
                          {doc.title}
                        </p>
                        <p className="text-sm text-slate-400">{doc.type}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[doc.status]}`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Expiring Date</span>
                      <span className="font-medium text-slate-700">
                        {doc.expiringDate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Uploaded By</span>
                      <span className="font-medium text-slate-700">
                        {doc.uploadedBy}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-5 border-t border-slate-100 pt-3">
                    <ActionButton icon="eye" label="View Details" />
                    <ActionButton icon="pencil" label="Edit" />
                    <ActionButton icon="download" label="Export" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
