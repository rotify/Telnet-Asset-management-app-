"use client";

import { useMemo, useState } from "react";
import { ManagerPageShell } from "@/components/layout/manager-page-shell";
import { DataList } from "@/components/data-list";
import { StatusDot } from "@/components/status-dot";
import { ViewToggleButton } from "@/components/view-toggle";
import { managerLabel, useManagerContext } from "@/lib/manager";
import { useManagedAssets } from "@/lib/manager-data";
import {
  DOC_TONES,
  docStatus,
  expiryLabel,
  expiryTone,
  fmtDate,
  prettyStatus,
  statusTone,
} from "@/lib/staff-helpers";
import type { Equipment, Vehicle } from "@/types/asset";
import type { DocumentRecord } from "@/types/document";

const select =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none";

function assignee(a: { assigned_staff?: unknown; assigned_user?: unknown }): string {
  if (typeof a.assigned_user === "string" && a.assigned_user.trim()) return a.assigned_user;
  return a.assigned_staff != null && a.assigned_staff !== "" ? `Staff #${a.assigned_staff}` : "Unassigned";
}

export default function ManagerAssetsPage() {
  const { type } = useManagerContext();
  const data = useManagedAssets(type);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const q = search.trim().toLowerCase();
  const statusOf = (s: string) => prettyStatus(s);

  const equipment = useMemo(
    () =>
      data.equipment.filter(
        (e) =>
          (statusFilter === "All" || statusOf(e.status) === statusFilter) &&
          (!q || `${e.name} ${e.serial_number ?? ""} ${e.equipment_type} ${e.location ?? ""} ${assignee(e)}`.toLowerCase().includes(q))
      ),
    [data.equipment, q, statusFilter]
  );
  const vehicles = useMemo(
    () =>
      data.vehicles.filter(
        (v) =>
          (statusFilter === "All" || statusOf(v.status) === statusFilter) &&
          (!q || `${v.name} ${v.license_plate} ${v.make} ${v.model} ${assignee(v)}`.toLowerCase().includes(q))
      ),
    [data.vehicles, q, statusFilter]
  );
  const documents = useMemo(
    () =>
      data.documents.filter(
        (d) =>
          (statusFilter === "All" || docStatus(d.expiry_date) === statusFilter) &&
          (!q || `${d.name} ${d.document_type} ${d.document_number ?? ""}`.toLowerCase().includes(q))
      ),
    [data.documents, q, statusFilter]
  );

  const statusOptions =
    type === "documents"
      ? ["All", "Valid", "Expiring", "Expired"]
      : [
          "All",
          ...Array.from(
            new Set((type === "equipment" ? data.equipment : data.vehicles).map((a) => statusOf(a.status)))
          ),
        ];

  const title = type ? managerLabel(type).replace(" Manager", "") : "Assets";
  const shown = type === "equipment" ? equipment : type === "vehicles" ? vehicles : documents;

  return (
    <ManagerPageShell
      title={title}
      description={`The ${title.toLowerCase()} you manage.`}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={`Search ${title.toLowerCase()}…`}
      actions={
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={select}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                Status: {s}
              </option>
            ))}
          </select>
          <ViewToggleButton
            viewMode={viewMode}
            onToggle={() => setViewMode((m) => (m === "table" ? "card" : "table"))}
          />
        </div>
      }
    >
      {data.loading && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
      {data.error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.error}
        </p>
      )}
      {!data.loading && !data.error && shown.length === 0 && (
        <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          Nothing found.
        </p>
      )}

      {type === "equipment" && equipment.length > 0 && (
        <DataList<Equipment>
          rows={equipment}
          rowKey={(e) => e.id}
          viewMode={viewMode}
          columns={[
            { header: "Name", cell: (e) => <span className="font-semibold text-slate-800">{e.name}</span> },
            { header: "Category", cell: (e) => <span className="text-slate-500">{prettyStatus(e.equipment_type)}</span> },
            { header: "Serial", cell: (e) => <span className="text-slate-500">{e.serial_number || "—"}</span> },
            { header: "Status", cell: (e) => <StatusDot label={prettyStatus(e.status)} tone={statusTone(e.status)} /> },
            { header: "Assigned to", cell: (e) => <span className="text-slate-500">{assignee(e)}</span> },
            { header: "Location", cell: (e) => <span className="text-slate-500">{e.location || "—"}</span> },
          ]}
          renderCard={(e) => (
            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-800">{e.name}</p>
                <StatusDot label={prettyStatus(e.status)} tone={statusTone(e.status)} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {prettyStatus(e.equipment_type)} · {e.serial_number || "no serial"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{assignee(e)}</p>
            </div>
          )}
        />
      )}

      {type === "vehicles" && vehicles.length > 0 && (
        <DataList<Vehicle>
          rows={vehicles}
          rowKey={(v) => v.id}
          viewMode={viewMode}
          columns={[
            { header: "Vehicle", cell: (v) => <span className="font-semibold text-slate-800">{v.name}</span> },
            { header: "Plate", cell: (v) => <span className="text-slate-500">{v.license_plate || "—"}</span> },
            { header: "Make / Model", cell: (v) => <span className="text-slate-500">{`${v.make ?? ""} ${v.model ?? ""}`.trim() || "—"}</span> },
            { header: "Status", cell: (v) => <StatusDot label={prettyStatus(v.status)} tone={statusTone(v.status)} /> },
            {
              header: "Insurance",
              cell: (v) => (
                <StatusDot label={expiryLabel(v.insurance_expiry)} tone={expiryTone(v.insurance_expiry)} />
              ),
            },
            { header: "Assigned to", cell: (v) => <span className="text-slate-500">{assignee(v)}</span> },
          ]}
          renderCard={(v) => (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">{v.name}</p>
                  <p className="text-xs text-slate-500">{v.license_plate || "no plate"}</p>
                </div>
                <StatusDot label={prettyStatus(v.status)} tone={statusTone(v.status)} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{assignee(v)}</p>
            </div>
          )}
        />
      )}

      {type === "documents" && documents.length > 0 && (
        <DataList<DocumentRecord>
          rows={documents}
          rowKey={(d) => d.id}
          viewMode={viewMode}
          columns={[
            { header: "Name", cell: (d) => <span className="font-semibold text-slate-800">{d.name}</span> },
            { header: "Type", cell: (d) => <span className="text-slate-500">{prettyStatus(d.document_type)}</span> },
            { header: "Number", cell: (d) => <span className="text-slate-500">{d.document_number || "—"}</span> },
            { header: "Expiry", cell: (d) => <span className="text-slate-500">{fmtDate(d.expiry_date)}</span> },
            {
              header: "Status",
              cell: (d) => {
                const s = docStatus(d.expiry_date);
                return <StatusDot label={s} tone={DOC_TONES[s]} />;
              },
            },
          ]}
          renderCard={(d) => {
            const s = docStatus(d.expiry_date);
            return (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800">{d.name}</p>
                  <StatusDot label={s} tone={DOC_TONES[s]} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {prettyStatus(d.document_type)} · expires {fmtDate(d.expiry_date)}
                </p>
              </div>
            );
          }}
        />
      )}
    </ManagerPageShell>
  );
}
