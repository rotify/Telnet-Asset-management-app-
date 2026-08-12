"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { getVehicles, getStaff } from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AssetActions } from "@/components/asset-actions";
import type { Vehicle } from "@/types/asset";
import type { Staff } from "@/types/staff";

const STATUS_STYLES: Record<string, string> = {
  available: "bg-green-50 text-green-700",
  assigned: "bg-blue-50 text-blue-700",
  maintenance: "bg-amber-50 text-amber-700",
  expired: "bg-red-50 text-red-700",
  inactive: "bg-slate-100 text-slate-500",
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

function nearestExpiry(v: Vehicle): { text: string; tone: string } {
  const candidates: [string, string | null][] = [
    ["Insurance", v.insurance_expiry],
    ["Roadworthiness", v.roadworthy_expiry],
    ["License", v.license_expiry],
  ];
  const withDates = candidates
    .filter(([, d]) => !!d)
    .map(([label, d]) => ({
      label,
      date: d as string,
      time: new Date(d as string).getTime(),
    }))
    .filter((c) => !Number.isNaN(c.time))
    .sort((a, b) => a.time - b.time);

  if (withDates.length === 0) {
    return { text: "No expiry dates on file", tone: "text-slate-400" };
  }

  const soonest = withDates[0];
  const days = Math.ceil((soonest.time - Date.now()) / 86400000);
  const formatted = formatDate(soonest.date);
  if (days < 0)
    return {
      text: `${soonest.label} expired ${formatted}`,
      tone: "text-red-600",
    };
  if (days <= 30)
    return {
      text: `${soonest.label} due ${formatted}`,
      tone: "text-amber-600",
    };
  return {
    text: `${soonest.label} until ${formatted}`,
    tone: "text-green-600",
  };
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

  const staffOptions = useMemo(
    () => staff.map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })),
    [staff]
  );

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
        (v.assigned_staff ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [vehicles, search, statusFilter]);

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <header>
            <h1 className="text-2xl font-bold text-[#121B3B]">Vehicles</h1>
            <p className="mt-1 text-sm text-slate-500">
              Live vehicle records from the backend.
            </p>
          </header>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            Columns are adapted for vehicles: there&apos;s no department or
            purchase-date field on the API, so this table shows Make/Model in
            that slot and skips purchase date. &quot;Warranty&quot; shows the
            soonest of insurance, roadworthiness, or license expiry instead,
            since vehicles track three separate expiry dates.
          </div>

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
                placeholder="Search by name, plate, VIN, or assignee…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </select>
          </div>

          {isLoading && !error && (
            <p className="mt-6 text-sm text-slate-500">Loading vehicles…</p>
          )}

          {!isLoading && !error && (
            <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-blue-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Vehicle Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Plate / VIN</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Make / Model</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Next Expiry</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm text-slate-400"
                      >
                        No vehicles match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((v) => {
                      const statusKey = (v.status ?? "").toLowerCase();
                      const expiry = nearestExpiry(v);
                      return (
                        <tr
                          key={v.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {v.name}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {v.asset_type || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {v.license_plate || v.vin_number || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {v.assigned_staff || "Unassigned"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {[v.make, v.model].filter(Boolean).join(" ") || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                                STATUS_STYLES[statusKey] ??
                                "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {titleCase(v.status)}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-xs ${expiry.tone}`}>
                            {expiry.text}
                          </td>
                          <td className="px-4 py-3">
                            <AssetActions
                              assetId={v.asset}
                              staffOptions={staffOptions}
                              onChanged={() => setRefreshKey((k) => k + 1)}
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
