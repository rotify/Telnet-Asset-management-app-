"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { getEquipment, getVehicles } from "@/lib/api";
import type { Equipment, Vehicle } from "@/types/asset";

interface DashboardData {
  equipment: Equipment[];
  vehicles: Vehicle[];
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#121B3B]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status?.toLowerCase() === "active";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
        isActive
          ? "bg-green-100 text-green-800"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "unknown"}
    </span>
  );
}

function RecentList({
  title,
  items,
}: {
  title: string;
  items: { id: string | number; name: string; status: string; assignee: string | null }[];
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      <p className="text-sm font-semibold text-[#121B3B]">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Nothing here yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <div>
                <p className="font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-400">
                  {item.assignee ? `Assigned to ${item.assignee}` : "Unassigned"}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
        const [equipment, vehicles] = await Promise.all([
          getEquipment(),
          getVehicles(),
        ]);
        if (!cancelled) {
          setData({ equipment, vehicles });
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

  if (!gateChecked) return null;

  const equipment = data?.equipment ?? [];
  const vehicles = data?.vehicles ?? [];
  const unassignedEquipment = equipment.filter(
    (e) => !e.assigned_staff && !e.assigned_user
  ).length;
  const unassignedVehicles = vehicles.filter((v) => !v.assigned_staff).length;

  const recentEquipment = [...equipment]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      assignee: e.assigned_staff ?? e.assigned_user,
    }));

  const recentVehicles = [...vehicles]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 5)
    .map((v) => ({
      id: v.id,
      name: v.name,
      status: v.status,
      assignee: v.assigned_staff,
    }));

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#EFF1F6] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-2xl font-bold text-[#121B3B]">
          Welcome, {username}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live snapshot of company equipment and vehicles.
        </p>

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
              <StatCard label="Total equipment" value={equipment.length} />
              <StatCard label="Total vehicles" value={vehicles.length} />
              <StatCard label="Unassigned equipment" value={unassignedEquipment} />
              <StatCard label="Unassigned vehicles" value={unassignedVehicles} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RecentList title="Recent equipment" items={recentEquipment} />
              <RecentList title="Recent vehicles" items={recentVehicles} />
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/50 p-4 text-sm text-slate-500">
              No apis for staff management yet
            </div>
          </>
        )}
      </div>
    </div>
  );
}