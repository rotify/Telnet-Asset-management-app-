"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import {
  deleteEquipment,
  exportEquipmentCsv,
  getEquipment,
  getStaff,
} from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import { AssetActions } from "@/components/asset-actions";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import type { Equipment } from "@/types/asset";
import type { Staff } from "@/types/staff";

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB");
}

function warrantyLabel(dateStr: string | null): { text: string; tone: string } {
  if (!dateStr) return { text: "No warranty on file", tone: "text-slate-400" };
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return { text: dateStr, tone: "text-slate-500" };
  const days = Math.ceil((target - Date.now()) / 86400000);
  const formatted = formatDate(dateStr);
  if (days < 0) return { text: `Expired ${formatted}`, tone: "text-red-600" };
  if (days <= 30)
    return { text: `Active until ${formatted}`, tone: "text-amber-600" };
  return { text: `Active until ${formatted}`, tone: "text-green-600" };
}

export default function EquipmentPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
        const [eq, staffList] = await Promise.all([
          getEquipment(),
          getStaff(),
        ]);
        if (!cancelled) {
          setEquipment(eq);
          setStaff(staffList);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't load equipment."
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

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    equipment.forEach((e) => {
      if (e.status) set.add(titleCase(e.status));
    });
    return ["All", ...Array.from(set)];
  }, [equipment]);

  const filtered = useMemo(() => {
    return equipment.filter((e) => {
      const matchesStatus =
        statusFilter === "All" || titleCase(e.status) === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        e.name?.toLowerCase().includes(q) ||
        e.serial_number?.toLowerCase().includes(q) ||
        e.tag_number?.toLowerCase().includes(q) ||
        resolveAssignee(e.assigned_staff, e.assigned_user)
          .toLowerCase()
          .includes(q);
      return matchesStatus && matchesSearch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment, search, statusFilter, staffNameById]);

  async function handleExport() {
    setExportError(null);
    setIsExporting(true);
    try {
      const csv = await exportEquipmentCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "equipment.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Couldn't export equipment."
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <AdminTopBar />

          <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">
                Company Equipment
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Monitor company assets, vehicles, equipment, maintenance
                schedules, and document status from one centralized dashboard.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {isExporting ? "Exporting…" : "Export"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/equipment/new")}
                className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b]"
              >
                + Register Equipment
              </button>
            </div>
          </header>

          {exportError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {exportError}
            </div>
          )}

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
                placeholder="Search by name, serial number, or assignee…"
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
            <p className="mt-6 text-sm text-slate-500">Loading equipment…</p>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              No equipment matches your search.
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="mt-6 space-y-3 md:hidden">
              {filtered.map((e) => {
                const statusKey = (e.status ?? "").toLowerCase();
                const warranty = warrantyLabel(e.warranty_expiry);
                return (
                  <div
                    key={e.id}
                    className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {e.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {e.equipment_type || "—"}
                        </p>
                      </div>
                      <StatusDot
                        label={titleCase(e.status)}
                        tone={STATUS_TONES[statusKey] ?? "slate"}
                        className="shrink-0"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <p className="text-slate-400">Serial No</p>
                        <p className="text-slate-700">
                          {e.serial_number || e.tag_number || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Assigned To</p>
                        <p className="text-slate-700">
                          {resolveAssignee(e.assigned_staff, e.assigned_user)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Department</p>
                        <p className="text-slate-700">
                          {e.regional_office || e.subsidiary || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Purchase Date</p>
                        <p className="text-slate-700">
                          {formatDate(e.purchase_date)}
                        </p>
                      </div>
                    </div>

                    <p className={`mt-3 text-xs ${warranty.tone}`}>
                      {warranty.text}
                    </p>

                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <AssetActions
                        assetId={e.asset}
                        staffOptions={staffOptions}
                        onChanged={() => setRefreshKey((k) => k + 1)}
                        onEdit={() => router.push(`/admin/equipment/${e.id}/edit`)}
                        onDelete={() => deleteEquipment(e.id)}
                        deleteConfirmLabel={e.name}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="mt-6 hidden overflow-x-auto rounded-xl bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06)] md:block">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-blue-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Doc Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Serial No</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Purchase Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Warranty</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-sm text-slate-400"
                      >
                        No equipment matches your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((e) => {
                      const statusKey = (e.status ?? "").toLowerCase();
                      const warranty = warrantyLabel(e.warranty_expiry);
                      return (
                        <tr
                          key={e.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {e.name}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {e.equipment_type || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {e.serial_number || e.tag_number || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {resolveAssignee(e.assigned_staff, e.assigned_user)}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {e.regional_office || e.subsidiary || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatDate(e.purchase_date)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusDot
                              label={titleCase(e.status)}
                              tone={STATUS_TONES[statusKey] ?? "slate"}
                            />
                          </td>
                          <td className={`px-4 py-3 text-xs ${warranty.tone}`}>
                            {warranty.text}
                          </td>
                          <td className="px-4 py-3">
                            <AssetActions
                              assetId={e.asset}
                              staffOptions={staffOptions}
                              onChanged={() => setRefreshKey((k) => k + 1)}
                              onEdit={() =>
                                router.push(`/admin/equipment/${e.id}/edit`)
                              }
                              onDelete={() => deleteEquipment(e.id)}
                              deleteConfirmLabel={e.name}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
