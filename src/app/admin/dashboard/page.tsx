"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { getEquipment, getVehicles, getStaff } from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import type { Equipment, Vehicle } from "@/types/asset";
import type { Staff } from "@/types/staff";

interface DashboardData {
  equipment: Equipment[];
  vehicles: Vehicle[];
  staff: Staff[];
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

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#121B3B]">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
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

const ALERT_STYLES: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [gateChecked, setGateChecked] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        const [equipment, vehicles, staff] = await Promise.all([
          getEquipment(),
          getVehicles(),
          getStaff(),
        ]);
        if (!cancelled) {
          setData({ equipment, vehicles, staff });
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
    return items
      .filter((i) => i.created_at)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 6);
  }, [equipment, vehicles, staff]);

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

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">
                Asset Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Monitor company assets, vehicles, equipment, and staff from one
                centralized dashboard.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              Signed in as <span className="font-semibold text-[#121B3B]">{username}</span>
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
                />
                <StatCard label="Total vehicles" value={vehicles.length} />
                <StatCard label="Total equipment" value={equipment.length} />
                <StatCard
                  label="Total staff"
                  value={staff.length}
                  hint="Documents count pending backend API"
                />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                  <p className="text-sm font-semibold text-[#121B3B]">
                    Asset status
                  </p>
                  <div className="mt-4 space-y-3">
                    {statusBreakdown.map((s) => (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{s.label}</span>
                          <span>{s.count}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-blue-600"
                            style={{
                              width: `${(s.count / maxStatusCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                  <p className="text-sm font-semibold text-[#121B3B]">
                    Recent activity
                  </p>
                  {recentActivity.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">
                      Nothing recorded yet.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-slate-100">
                      {recentActivity.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
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
                    {upcomingAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          ALERT_STYLES[alert.level] ?? ALERT_STYLES.info
                        }`}
                      >
                        <p className="font-medium">{alert.message}</p>
                        {alert.sub && (
                          <p className="text-xs opacity-80">{alert.sub}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  Document expiry alerts (insurance, roadworthiness certificates
                  filed as documents) aren&apos;t shown here yet — the backend
                  doesn&apos;t expose a documents endpoint.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
