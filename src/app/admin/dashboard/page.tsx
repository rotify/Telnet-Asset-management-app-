"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { getEquipment, getVehicles, getStaff, getDocuments } from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import { STATUS_COLORS } from "@/components/status-dot";
import type { Equipment, Vehicle } from "@/types/asset";
import type { Staff } from "@/types/staff";
import type { DocumentRecord } from "@/types/document";

const STATUS_BAR_COLORS: Record<string, string> = {
  Available: STATUS_COLORS.green,
  Assigned: STATUS_COLORS.green,
  Maintenance: STATUS_COLORS.orange,
  Expired: STATUS_COLORS.red,
  Inactive: STATUS_COLORS.red,
};

interface DashboardData {
  equipment: Equipment[];
  vehicles: Vehicle[];
  staff: Staff[];
  documents: DocumentRecord[];
}

const STATUS_ORDER = ["Available", "Assigned", "Maintenance", "Expired", "Inactive"];

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / 86400000);
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function ExportIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </svg>
  );
}

function AssetsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}

function VehicleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="13" height="11" rx="1.5" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="6" cy="19" r="1.6" />
      <circle cx="17" cy="19" r="1.6" />
    </svg>
  );
}

function EquipmentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-3-3-3 3Z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a1.7 1.7 0 0 0 1.5 2.5h17.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a1.7 1.7 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 9.5 5 5m0-5-5 5" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      <div className="flex items-center gap-3">
        <span className="flex h-[51px] w-[51px] shrink-0 items-center justify-center rounded-2xl bg-[#F0F6FA] text-telnet-primary">
          {icon}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="text-2xl font-bold text-[#121B3B]">{value}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function TagPill({ tag }: { tag: string }) {
  const styles: Record<string, string> = {
    Vehicle: "bg-slate-100 text-slate-700",
    Equipment: "bg-amber-100 text-amber-700",
    Staff: "bg-violet-100 text-violet-700",
    Document: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
        styles[tag] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {tag}
    </span>
  );
}

const TAG_DOT_COLORS: Record<string, string> = {
  Vehicle: "#576A77",
  Equipment: "#F6AD3F",
  Staff: "#7C3AED",
  Document: "#2DB130",
};

const ALERT_STYLES: Record<string, { row: string; icon: string }> = {
  critical: { row: "border-[#F3B3B6] bg-[#FDEEEF]", icon: "#FD7072" },
  warning: { row: "border-[#F4D199] bg-[#FCF3E5]", icon: "#F6AD3F" },
  info: { row: "border-[#F0F6FA] bg-[#F0F6FA]", icon: "#576A77" },
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [gateChecked, setGateChecked] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showRegisterMenu, setShowRegisterMenu] = useState(false);

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
    setUsername(storedUsername);
    setGateChecked(true);
  }, [router]);

  useEffect(() => {
    if (!gateChecked) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [equipment, vehicles, staff, documents] = await Promise.all([
          getEquipment(),
          getVehicles(),
          getStaff(),
          getDocuments().catch(() => []),
        ]);
        if (!cancelled) {
          setData({ equipment, vehicles, staff, documents });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't load dashboard data."
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
  }, [gateChecked]);

  const equipment = useMemo(() => data?.equipment ?? [], [data]);
  const vehicles = useMemo(() => data?.vehicles ?? [], [data]);
  const staff = useMemo(() => data?.staff ?? [], [data]);
  const documents = useMemo(() => data?.documents ?? [], [data]);

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    [...equipment, ...vehicles].forEach((item) => {
      const key = titleCase(item.status);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const known = STATUS_ORDER.map((label) => ({
      label,
      count: counts.get(label) ?? 0,
    }));
    const extras = [...counts.entries()]
      .filter(([label]) => !STATUS_ORDER.includes(label))
      .map(([label, count]) => ({ label, count }));
    return [...known, ...extras];
  }, [equipment, vehicles]);

  const maxStatusCount = Math.max(1, ...statusBreakdown.map((s) => s.count));

  const recentActivity = useMemo(() => {
    const items = [
      ...equipment.map((e) => ({
        id: `equipment-${e.id}`,
        tag: "Equipment" as const,
        title: e.name,
        sub: e.assigned_staff
          ? `Assigned to ${e.assigned_staff}`
          : "Equipment registered",
        created_at: e.created_at,
      })),
      ...vehicles.map((v) => ({
        id: `vehicle-${v.id}`,
        tag: "Vehicle" as const,
        title: v.name,
        sub: v.assigned_staff
          ? `Assigned to ${v.assigned_staff}`
          : "Vehicle registered",
        created_at: v.created_at,
      })),
      ...staff.map((s) => ({
        id: `staff-${s.id}`,
        tag: "Staff" as const,
        title: `${s.first_name} ${s.last_name}`.trim(),
        sub: s.department ? `Added to ${s.department}` : "Staff member added",
        created_at: s.created_at,
      })),
    ];
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => i.created_at)
      .filter((i) => !q || i.title.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 6);
  }, [equipment, vehicles, staff, search]);

  const upcomingAlerts = useMemo(() => {
    const alerts: { id: string; message: string; sub: string; level: string }[] = [];

    vehicles.forEach((v) => {
      const checks: [string, string | null][] = [
        ["insurance", v.insurance_expiry],
        ["roadworthiness", v.roadworthy_expiry],
        ["license", v.license_expiry],
      ];
      checks.forEach(([kind, dateStr]) => {
        const days = daysUntil(dateStr);
        if (days === null) return;
        if (days <= 30) {
          alerts.push({
            id: `${v.id}-${kind}`,
            message: `${v.name} ${kind} ${days < 0 ? "expired" : "expiring soon"}`,
            sub: dateStr ? `Due ${dateStr.slice(0, 10)}` : "",
            level: days < 0 ? "critical" : days <= 7 ? "warning" : "info",
          });
        }
      });
    });

    equipment.forEach((e) => {
      const days = daysUntil(e.warranty_expiry);
      if (days === null) return;
      if (days <= 30) {
        alerts.push({
          id: `${e.id}-warranty`,
          message: `${e.name} warranty ${days < 0 ? "expired" : "expiring soon"}`,
          sub: e.warranty_expiry ? `Due ${e.warranty_expiry.slice(0, 10)}` : "",
          level: days < 0 ? "critical" : days <= 7 ? "warning" : "info",
        });
      }
    });

    return alerts.slice(0, 6);
  }, [equipment, vehicles]);

  function handleExport() {
    const rows = [
      ["Metric", "Value"],
      ["Total assets", String(equipment.length + vehicles.length)],
      ["Total vehicles", String(vehicles.length)],
      ["Total equipment", String(equipment.length)],
      ["Total documents", String(documents.length)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asset-management-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <AdminTopBar
            search={search}
            onSearchChange={setSearch}
            hasNotifications={upcomingAlerts.length > 0}
          />

          <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">
                Asset Management
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
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <ExportIcon />
                Export
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRegisterMenu((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e293b]"
                >
                  + Register Asset
                </button>
                {showRegisterMenu && (
                  <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => router.push("/admin/equipment/new")}
                      className="block w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Register Equipment
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/admin/vehicles/new")}
                      className="block w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Register Vehicle
                    </button>
                  </div>
                )}
              </div>
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

          {isLoading && !error && (
            <p className="mt-6 text-sm text-slate-500">Loading dashboard…</p>
          )}

          {!isLoading && !error && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  label="Total assets"
                  value={equipment.length + vehicles.length}
                  hint="View every registered assets"
                  icon={<AssetsIcon />}
                />
                <StatCard
                  label="Total vehicles"
                  value={vehicles.length}
                  hint="Monitor all company vehicles and status."
                  icon={<VehicleIcon />}
                />
                <StatCard
                  label="Total equipment"
                  value={equipment.length}
                  hint="Track office equipment"
                  icon={<EquipmentIcon />}
                />
                <StatCard
                  label="Total documents"
                  value={documents.length}
                  hint="Manage all sort of documents."
                  icon={<DocumentIcon />}
                />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#121B3B]">
                      Asset status
                    </p>
                    <span className="text-slate-400">⋯</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {statusBreakdown.map((s) => (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{s.label}</span>
                          <span>{s.count}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${(s.count / maxStatusCount) * 100}%`,
                              backgroundColor:
                                STATUS_BAR_COLORS[s.label] ??
                                STATUS_COLORS.slate,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#121B3B]">
                      Recent activities
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push("/admin/assets")}
                      className="text-xs font-semibold text-telnet-primary hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  {recentActivity.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">
                      Nothing recorded yet.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-slate-100">
                      {recentActivity.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 py-2 text-sm"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: TAG_DOT_COLORS[item.tag] }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-800">
                              {item.title}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {item.sub} · {timeAgo(item.created_at)}
                            </p>
                          </div>
                          <TagPill tag={item.tag} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                <p className="text-sm font-semibold text-[#121B3B]">
                  Upcoming alerts
                </p>
                {upcomingAlerts.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">
                    No vehicle or equipment expiries in the next 30 days.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {upcomingAlerts.map((alert) => {
                      const style = ALERT_STYLES[alert.level] ?? ALERT_STYLES.info;
                      return (
                        <div
                          key={alert.id}
                          className={`flex items-start gap-2 rounded border px-3 py-2 text-sm ${style.row}`}
                        >
                          <span className="mt-0.5 shrink-0" style={{ color: style.icon }}>
                            {alert.level === "info" ? <VehicleIcon /> : alert.level === "warning" ? <XCircleIcon /> : <AlertTriangleIcon />}
                          </span>
                          <div>
                            <p className="font-medium text-slate-800">
                              {alert.message}
                            </p>
                            {alert.sub && (
                              <p className="text-xs text-slate-500">{alert.sub}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
