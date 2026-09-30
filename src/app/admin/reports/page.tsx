"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import {
  getAuditReport,
  getDocumentsReport,
  getEquipmentReport,
  getMaintenanceReport,
  getReportOverview,
  getTransfersReport,
  getVehiclesReport,
  type MaintenanceReport,
  type ReportListResponse,
  type ReportOverview,
} from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";

const TABS = [
  "Overview",
  "Vehicles",
  "Equipment",
  "Documents",
  "Maintenance",
  "Transfers",
  "Audit",
] as const;
type Tab = (typeof TABS)[number];

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function prettifyKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Renders whatever rows a report endpoint returns without assuming a
// fixed schema — columns are the union of keys seen across rows. The
// exact shape of these report rows isn't confirmed against live data
// yet, so this stays generic rather than guessing field names.
function DynamicTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-sm text-slate-400">No records yet.</p>;
  }
  const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
            {columns.map((col) => (
              <th key={col} className="whitespace-nowrap py-2 pr-4 font-medium">
                {prettifyKey(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td
                  key={col}
                  className="whitespace-nowrap py-2 pr-4 text-slate-700"
                >
                  {/* The ID column shows each record's real database id,
                      which isn't sequential once rows are sorted newest
                      first — display the row's position instead so it
                      always reads 1, 2, 3. */}
                  {col === "id" ? i + 1 : formatValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#121B3B]">{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [vehicles, setVehicles] = useState<ReportListResponse | null>(null);
  const [equipment, setEquipment] = useState<ReportListResponse | null>(null);
  const [documents, setDocuments] = useState<ReportListResponse | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceReport | null>(
    null
  );
  const [transfers, setTransfers] = useState<ReportListResponse | null>(null);
  const [audit, setAudit] = useState<ReportListResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!gateChecked) return;
    setIsLoading(true);
    setError(null);
    Promise.all([
      getReportOverview(),
      getVehiclesReport(),
      getEquipmentReport(),
      getDocumentsReport(),
      getMaintenanceReport(),
      getTransfersReport(),
      getAuditReport(),
    ])
      .then(([o, v, e, d, m, t, a]) => {
        setOverview(o);
        setVehicles(v);
        setEquipment(e);
        setDocuments(d);
        setMaintenance(m);
        setTransfers(t);
        setAudit(a);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Couldn't load reports.");
      })
      .finally(() => setIsLoading(false));
  }, [gateChecked]);

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          {/* Sticky so the search/date/profile bar stays put while the
              page content below scrolls, matching the sidebar's fixed
              positioning instead of scrolling away with the page. */}
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <AdminTopBar
              title="Reports"
              description="Fleet, equipment, and document reporting across the company."
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-1 rounded-xl bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-[#0F172A] text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading && !error && (
            <p className="mt-6 text-sm text-slate-500">Loading reports…</p>
          )}

          {!isLoading && !error && (
            <>
              {activeTab === "Overview" && overview && (
                <div className="mt-6 space-y-6">
                  <p className="text-xs text-slate-400">
                    Generated{" "}
                    {new Date(overview.generated_at).toLocaleString("en-GB")}
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label="Total Assets" value={overview.assets.total} />
                    <StatCard label="Active Assets" value={overview.assets.active} />
                    <StatCard label="Unassigned" value={overview.assets.unassigned} />
                    <StatCard label="Vehicles" value={overview.vehicles} />
                    <StatCard label="Equipment" value={overview.equipment} />
                    <StatCard label="Documents" value={overview.documents.total} />
                    <StatCard
                      label="Documents Expired"
                      value={overview.documents.expired}
                    />
                    <StatCard
                      label="Documents Expiring"
                      value={overview.documents.expiring}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard
                      label="Vehicle Maintenance Cost"
                      value={overview.maintenance.vehicle_cost.toLocaleString()}
                    />
                    <StatCard
                      label="Equipment Maintenance Cost"
                      value={overview.maintenance.equipment_cost.toLocaleString()}
                    />
                  </div>
                </div>
              )}

              {activeTab === "Vehicles" && vehicles && (
                <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                  <p className="mb-4 text-sm text-slate-500">
                    {vehicles.count} vehicle{vehicles.count === 1 ? "" : "s"}
                  </p>
                  <DynamicTable rows={vehicles.results} />
                </div>
              )}

              {activeTab === "Equipment" && equipment && (
                <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                  <p className="mb-4 text-sm text-slate-500">
                    {equipment.count} item{equipment.count === 1 ? "" : "s"}
                  </p>
                  <DynamicTable rows={equipment.results} />
                </div>
              )}

              {activeTab === "Documents" && documents && (
                <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                  <p className="mb-4 text-sm text-slate-500">
                    {documents.count} document{documents.count === 1 ? "" : "s"}
                  </p>
                  <DynamicTable rows={documents.results} />
                </div>
              )}

              {activeTab === "Maintenance" && maintenance && (
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard
                      label="Vehicle Records"
                      value={maintenance.summary.vehicle_count}
                    />
                    <StatCard
                      label="Equipment Records"
                      value={maintenance.summary.equipment_count}
                    />
                    <StatCard
                      label="Vehicle Cost"
                      value={maintenance.summary.vehicle_cost.toLocaleString()}
                    />
                    <StatCard
                      label="Equipment Cost"
                      value={maintenance.summary.equipment_cost.toLocaleString()}
                    />
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                    <h3 className="mb-3 text-sm font-semibold text-[#121B3B]">
                      Vehicle Maintenance
                    </h3>
                    <DynamicTable rows={maintenance.vehicles} />
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                    <h3 className="mb-3 text-sm font-semibold text-[#121B3B]">
                      Equipment Maintenance
                    </h3>
                    <DynamicTable rows={maintenance.equipment} />
                  </div>
                </div>
              )}

              {activeTab === "Transfers" && transfers && (
                <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                  <p className="mb-4 text-sm text-slate-500">
                    {transfers.count} transfer{transfers.count === 1 ? "" : "s"}
                  </p>
                  <DynamicTable rows={transfers.results} />
                </div>
              )}

              {activeTab === "Audit" && audit && (
                <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                  <p className="mb-4 text-sm text-slate-500">
                    {audit.count} audit log entr{audit.count === 1 ? "y" : "ies"}
                  </p>
                  <DynamicTable rows={audit.results} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
