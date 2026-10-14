"use client";

import { useEffect, useMemo, useState } from "react";
import { documentFileUrl, getDocuments } from "@/lib/api";
import { StaffPageShell } from "@/components/layout/staff-page-shell";
import { DataList, EmptyNote } from "@/components/data-list";
import { StatusDot } from "@/components/status-dot";
import { expiryLabel, expiryTone, fmtDate } from "@/lib/staff-helpers";
import type { DocumentRecord } from "@/types/document";

function FileLink({ d }: { d: DocumentRecord }) {
  if (!d.document_file) return <span className="text-slate-400">—</span>;
  return (
    <a
      href={documentFileUrl(d.document_file)}
      target="_blank"
      rel="noreferrer"
      className="text-sm font-medium text-telnet-primary hover:underline"
    >
      View
    </a>
  );
}

export default function StaffDocumentsPage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDocuments()
      .then(setDocs)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load your documents.")
      )
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter(
      (d) =>
        !q ||
        [d.name, d.document_type, d.document_number ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q)
    );
  }, [docs, search]);

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
      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyNote>No documents found.</EmptyNote>
      ) : (
        <DataList
          rows={filtered}
          rowKey={(d) => d.id}
          viewMode="table"
          columns={[
            { header: "Document", cell: (d) => d.name },
            { header: "Type", cell: (d) => d.document_type || "—" },
            { header: "Issued", cell: (d) => fmtDate(d.issue_date) },
            {
              header: "Expiry",
              cell: (d) => (
                <StatusDot
                  label={expiryLabel(d.expiry_date)}
                  tone={expiryTone(d.expiry_date)}
                />
              ),
            },
            { header: "File", cell: (d) => <FileLink d={d} /> },
          ]}
          renderCard={(d) => (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#121B3B]">{d.name}</p>
              <p className="text-xs text-slate-400">{d.document_type || "—"}</p>
              <StatusDot
                label={expiryLabel(d.expiry_date)}
                tone={expiryTone(d.expiry_date)}
              />
              <FileLink d={d} />
            </div>
          )}
        />
      )}
    </StaffPageShell>
  );
}
