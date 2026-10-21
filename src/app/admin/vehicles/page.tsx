"use client";

import { ExcelImport } from "@/components/excel-import";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import {
  getVehicles,
  getStaff,
  deleteVehicle,
  exportVehiclesCsv,
} from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import { AssetActions } from "@/components/asset-actions";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { ViewToggleButton } from "@/components/view-toggle";
import type { Vehicle } from "@/types/asset";
import type { Staff } from "@/types/staff";
import { isDriverStaff, useDriverUserIds } from "@/lib/drivers";


const STATUS_TONES: Record<string, StatusTone> = {
  active: "green",
  pending_certification: "orange",
  "pending certification": "orange",
  damaged: "red",
  inactive: "red",
};

function titleCase(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function expiryStatus(dateStr: string | null): { label: string; tone: StatusTone } {
  if (!dateStr) return { label: "No date", tone: "slate" };
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return { label: "No date", tone: "slate" };
  const days = Math.ceil((target - Date.now()) / 86400000);
  if (days < 0) return { label: "Expired", tone: "red" };
  if (days <= 30) return { label: "Expiring", tone: "orange" };
  return { label: "Valid", tone: "navy" };
}

export default function VehiclesPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

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
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [data, staffList] = await Promise.all([
          getVehicles(),
          getStaff(),
        ]);
        if (!cancelled) {
          setVehicles(data);
          setStaff(staffList);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't load vehicles."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [gateChecked, refreshKey]);

  
  const driverIds = useDriverUserIds(gateChecked);
  const staffOptions = useMemo(
    () =>
      staff
        .filter((s) => driverIds !== null && isDriverStaff(s, driverIds))
        .map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })),
    [staff, driverIds]
  );

  const staffNameById = useMemo(() => {
    const map = new Map<string, string>();
    staff.forEach((s) => map.set(String(s.id), `${s.first_name} ${s.last_name}`));
    return map;
  }, [staff]);

  function resolveAssignee(assignedStaff: string | null): string {
    if (assignedStaff) {
      return staffNameById.get(String(assignedStaff)) ?? assignedStaff;
    }
    return "Unassigned";
  }

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => {
      if (v.status) set.add(titleCase(v.status));
    });
    return ["All", ...Array.from(set)];
  }, [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesStatus =
        statusFilter === "All" || titleCase(v.status) === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        v.name?.toLowerCase().includes(q) ||
        v.license_plate?.toLowerCase().includes(q) ||
        v.vin_number?.toLowerCase().includes(q) ||
        resolveAssignee(v.assigned_staff).toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, search, statusFilter, staffNameById]);

  async function handleExport() {
    setExportError(null);
    setIsExporting(true);
    try {
      const csv = await exportVehiclesCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vehicles.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Couldn't export vehicles."
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="min-w-0 flex-1 px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <AdminTopBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by name, plate, VIN, or assignee…"
            />
          </div>

          <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">
                Vehicle Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Monitor company assets, vehicles, equipment, maintenance
                schedules, and document status from one centralized dashboard.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ViewToggleButton
                viewMode={viewMode}
                onToggle={() =>
                  setViewMode((m) => (m === "table" ? "card" : "table"))
                }
              />
              <ExcelImport kinds={["Vehicles"]} onImported={() => setRefreshKey((k) => k + 1)} />
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {isExporting ? "Exporting…" : "Export"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/vehicles/new")}
                className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b]"
              >
                + Register Asset
              </button>
            </div>
          </header>

          {error && (
            <div className="mt-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  setGateChecked(false);
                  setGateChecked(true);
                }}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {exportError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {exportError}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </select>
            {(search || statusFilter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                }}
                className="text-sm font-semibold text-telnet-primary hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          {isLoading && !error && (
            <p className="mt-6 text-sm text-slate-500">Loading vehicles…</p>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              No vehicles match your search.
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && viewMode === "table" && (
            <div className="mt-6 hidden overflow-x-auto rounded-xl bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06)] md:block">
              <table className="w-full min-w-[780px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-blue-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Driver</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Insurance</th>
                    <th className="px-4 py-3">Road Worthiness</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => {
                    const statusKey = (v.status ?? "").toLowerCase();
                    const insurance = expiryStatus(v.insurance_expiry);
                    const roadworthy = expiryStatus(v.roadworthy_expiry);
                    return (
                      <tr
                        key={v.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{v.name}</p>
                          <p className="text-xs text-slate-400">
                            {v.license_plate || v.vin_number || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-500">
                          {v.asset_type || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {resolveAssignee(v.assigned_staff)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {v.cost || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusDot label={insurance.label} tone={insurance.tone} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusDot label={roadworthy.label} tone={roadworthy.tone} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusDot
                            label={titleCase(v.status)}
                            tone={STATUS_TONES[statusKey] ?? "slate"}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <AssetActions
                            assetId={v.asset}
                            staffOptions={staffOptions}
                            onChanged={() => setRefreshKey((k) => k + 1)}
                            onEdit={() => router.push(`/admin/vehicles/${v.id}/edit`)}
                            onDelete={() => deleteVehicle(v.id)}
                            deleteConfirmLabel={v.name}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div
              className={`mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${
                viewMode === "table" ? "md:hidden" : ""
              }`}
            >
              {filtered.map((v) => {
                const statusKey = (v.status ?? "").toLowerCase();
                const insurance = expiryStatus(v.insurance_expiry);
                const roadworthy = expiryStatus(v.roadworthy_expiry);
                return (
                  <div
                    key={v.id}
                    className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 text-slate-400">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
                            <path d="M10 20a2 2 0 0 0 4 0" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {v.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {v.license_plate || v.vin_number || "—"}
                          </p>
                        </div>
                      </div>
                      <StatusDot
                        label={titleCase(v.status)}
                        tone={STATUS_TONES[statusKey] ?? "slate"}
                        className="shrink-0"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-1.5 border-t border-slate-100 pt-2 text-xs">
                      <div>
                        <p className="text-slate-400">Type</p>
                        <p className="font-medium capitalize text-slate-700">
                          {v.asset_type || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Driver</p>
                        <p className="font-medium text-slate-700">
                          {resolveAssignee(v.assigned_staff)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Cost</p>
                        <p className="font-medium text-slate-700">
                          {v.cost || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      <div>
                        <p className="text-slate-400">Insurance</p>
                        <StatusDot label={insurance.label} tone={insurance.tone} />
                      </div>
                      <div>
                        <p className="text-slate-400">Road Worthy</p>
                        <StatusDot label={roadworthy.label} tone={roadworthy.tone} />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-end border-t border-slate-100 pt-2">
                      <AssetActions
                        assetId={v.asset}
                        staffOptions={staffOptions}
                        onChanged={() => setRefreshKey((k) => k + 1)}
                        onEdit={() => router.push(`/admin/vehicles/${v.id}/edit`)}
                        onDelete={() => deleteVehicle(v.id)}
                        deleteConfirmLabel={v.name}
                      />
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
