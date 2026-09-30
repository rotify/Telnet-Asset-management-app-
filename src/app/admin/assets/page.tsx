"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import {
  getEquipment,
  getVehicles,
  getStaff,
  deleteEquipment,
  deleteVehicle,
} from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import { AssetActions } from "@/components/asset-actions";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { ViewToggleButton } from "@/components/view-toggle";
import type { Equipment, Vehicle } from "@/types/asset";
import type { Staff } from "@/types/staff";

interface AssetRow {
  key: string;
  asset: number;
  id: number;
  kind: "equipment" | "vehicle";
  assetId: string;
  name: string;
  category: string;
  assignedTo: string;
  location: string;
  status: string;
}

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

export default function AssetsPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [refreshKey, setRefreshKey] = useState(0);
  // Table is the default; mobile always shows cards regardless (see the
  // render blocks below) — the toggle only takes effect at md and up.
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
        const [eq, vh, st] = await Promise.all([
          getEquipment(),
          getVehicles(),
          getStaff(),
        ]);
        if (!cancelled) {
          setEquipment(eq);
          setVehicles(vh);
          setStaff(st);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load assets.");
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

  const staffOptions = useMemo(
    () => staff.map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })),
    [staff]
  );

  // assigned_staff comes back from the API as a raw staff id — resolve it
  // to a display name here instead of showing the id in the table.
  const staffNameById = useMemo(() => {
    const map = new Map<string, string>();
    staff.forEach((s) => map.set(String(s.id), `${s.first_name} ${s.last_name}`));
    return map;
  }, [staff]);

  function resolveAssignee(
    assignedStaff: string | null,
    assignedUser?: string | null
  ): string {
    if (assignedStaff) {
      return staffNameById.get(String(assignedStaff)) ?? assignedStaff;
    }
    return assignedUser || "Unassigned";
  }

  // Vehicles can only be assigned to staff registered as drivers.
  const driverStaffOptions = useMemo(
    () =>
      staff
        .filter((s) => Boolean(s.driver_status?.trim()))
        .map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })),
    [staff]
  );

  

  const rows: AssetRow[] = useMemo(() => {
    const eqRows: AssetRow[] = equipment.map((e) => ({
      key: `eq-${e.id}`,
      asset: e.asset,
      id: e.id,
      kind: "equipment",
      assetId: `EQ-${e.id}`,
      name: e.name,
      category: e.equipment_type || "Equipment",
      assignedTo: resolveAssignee(e.assigned_staff, e.assigned_user),
      location: e.location || e.regional_office || "—",
      status: e.status,
    }));
    const vhRows: AssetRow[] = vehicles.map((v) => ({
      key: `vh-${v.id}`,
      asset: v.asset,
      id: v.id,
      kind: "vehicle",
      assetId: `VH-${v.id}`,
      name: v.name,
      category: "Vehicle",
      assignedTo: resolveAssignee(v.assigned_staff),
      location: v.license_plate || "—",
      status: v.status,
    }));
    return [...eqRows, ...vhRows];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment, vehicles, staffNameById]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.status) set.add(titleCase(r.status));
    });
    return ["All", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesStatus =
        statusFilter === "All" || titleCase(r.status) === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.assetId.toLowerCase().includes(q) ||
        r.assignedTo.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  function editHref(r: AssetRow): string {
    return r.kind === "equipment"
      ? `/admin/equipment/${r.id}/edit`
      : `/admin/vehicles/${r.id}/edit`;
  }

  function deleteRow(r: AssetRow): Promise<void> {
    return r.kind === "equipment"
      ? deleteEquipment(r.id)
      : deleteVehicle(r.id);
  }

  // A literal `"` inside a value has to become `""` in CSV, or the quoted
  // field closes early and every value after it in the file gets misread —
  // often rendering as blank cells once opened in Excel/Numbers/Sheets.
  function csvCell(value: unknown): string {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function handleExport() {
    const rowsCsv = [
      ["Asset ID", "Asset Name", "Category", "Assigned To", "Location", "Status"],
      ...filtered.map((r) => [
        r.assetId,
        r.name,
        r.category,
        r.assignedTo,
        r.location,
        titleCase(r.status),
      ]),
    ];
    const csv = rowsCsv.map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assets.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          {/* Sticky so the title and date/profile bar stay put while the
              page content below scrolls, matching the sidebar's fixed
              positioning instead of scrolling away with the page. */}
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold uppercase text-[#121B3B]">
                  Company Asset
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
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/admin/equipment/new")}
                  className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b]"
                >
                  + Register Asset
                </button>
              </div>
            </header>
            <div className="mt-2">
              <AdminTopBar />
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
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
                placeholder="Search by name, ID, or assignee…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-telnet-primary focus:outline-none"
              />
            </div>
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
            <p className="mt-6 text-sm text-slate-500">Loading assets…</p>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              No assets match your search.
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div
              className={`mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 ${
                viewMode === "table" ? "md:hidden" : ""
              }`}
            >
              {filtered.map((r) => {
                const statusKey = (r.status ?? "").toLowerCase();
                return (
                  <div
                    key={r.key}
                    className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {r.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {r.assetId} · {r.category}
                        </p>
                      </div>
                      <StatusDot
                        label={titleCase(r.status)}
                        tone={STATUS_TONES[statusKey] ?? "slate"}
                        className="shrink-0"
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                      <div>
                        <p className="text-slate-400">Assigned To</p>
                        <p className="text-slate-700">{r.assignedTo}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Location</p>
                        <p className="text-slate-700">{r.location}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end border-t border-slate-100 pt-2">
                      <AssetActions
                        assetId={r.asset}
                        staffOptions={
                          r.kind === "vehicle" ? driverStaffOptions : staffOptions
                        }
                        onChanged={() => setRefreshKey((k) => k + 1)}
                        onEdit={() => router.push(editHref(r))}
                        onDelete={() => deleteRow(r)}
                        deleteConfirmLabel={r.name}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div
              className={`mt-6 hidden overflow-x-auto rounded-xl bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06)] ${
                viewMode === "table" ? "md:block" : ""
              }`}
            >
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-blue-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Asset ID</th>
                    <th className="px-4 py-3">Asset Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const statusKey = (r.status ?? "").toLowerCase();
                    return (
                      <tr
                        key={r.key}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 text-slate-500">
                          {r.assetId}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {r.name}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {r.category}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {r.assignedTo}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {r.location}
                        </td>
                        <td className="px-4 py-3">
                          <StatusDot
                            label={titleCase(r.status)}
                            tone={STATUS_TONES[statusKey] ?? "slate"}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <AssetActions
                            assetId={r.asset}
                            staffOptions={
                              r.kind === "vehicle"
                                ? driverStaffOptions
                                : staffOptions
                            }
                            onChanged={() => setRefreshKey((k) => k + 1)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
