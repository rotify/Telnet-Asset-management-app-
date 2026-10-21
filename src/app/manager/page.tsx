"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ManagerPageShell } from "@/components/layout/manager-page-shell";
import { StatCard } from "@/components/stat-card";
import { managerLabel, useManagerContext, type ManagerType } from "@/lib/manager";
import { buildAlerts, summarise, useManagedAssets } from "@/lib/manager-data";
import { docStatus } from "@/lib/staff-helpers";

const ALERT_STYLES = {
  critical: { row: "border-[#F3B3B6] bg-[#FDEEEF]", dot: "#FD7072" },
  warning: { row: "border-[#F4D199] bg-[#FCF3E5]", dot: "#F6AD3F" },
} as const;

const NOUN: Record<ManagerType, string> = {
  equipment: "equipment",
  vehicles: "vehicles",
  documents: "documents",
};

export default function ManagerDashboardPage() {
  const { type, name } = useManagerContext();
  const data = useManagedAssets(type);
  const [search, setSearch] = useState("");

  const cards = useMemo(() => {
    if (!type) return [];
    if (type === "documents") {
      const st = data.documents.map((d) => docStatus(d.expiry_date));
      const n = (s: string) => st.filter((x) => x === s).length;
      return [
        { label: "Total Documents", value: data.documents.length, hint: "All company documents" },
        { label: "Valid", value: n("Valid"), hint: "In date" },
        { label: "Expiring", value: n("Expiring"), hint: "Within 30 days" },
        { label: "Expired", value: n("Expired"), hint: "Needs renewal" },
      ];
    }
    const list = type === "equipment" ? data.equipment : data.vehicles;
    const n = (f: (s: string) => boolean) =>
      list.filter((a) => f((a.status ?? "").toLowerCase())).length;
    return [
      { label: `Total ${type === "equipment" ? "Equipment" : "Vehicles"}`, value: list.length, hint: "Everything you manage" },
      { label: "Active", value: n((s) => s === "active"), hint: "In service" },
      { label: "Inactive", value: n((s) => s === "inactive"), hint: "Out of service" },
      { label: "Pending", value: n((s) => s.includes("pending")), hint: "Awaiting certification" },
    ];
  }, [type, data]);

  const status = type ? summarise(type, data) : { total: 0, buckets: [] };
  const q = search.trim().toLowerCase();
  const alerts = type
    ? buildAlerts(type, data).filter((a) => !q || `${a.title} ${a.sub}`.toLowerCase().includes(q))
    : [];

  return (
    <ManagerPageShell
      title={type ? `${managerLabel(type)} Dashboard` : "Manager Dashboard"}
      description={
        type
          ? `Welcome, ${name}. Monitor the ${NOUN[type]} you manage.`
          : `Welcome, ${name}.`
      }
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search alerts..."
    >
      {!type && (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Your manager type isn&apos;t set yet, so no assets are shown. Ask an admin to set whether you
          manage equipment, vehicles or documents.
        </p>
      )}
      {data.error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.error}
        </p>
      )}

      {type && (data.loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="text-sm font-semibold text-[#121B3B]">Status Breakdown</h2>
            {status.buckets.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Nothing to show yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {status.buckets.map(([label, count]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{label}</span>
                      <span>{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-[#121B3B]"
                        style={{ width: `${(count / Math.max(status.total, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#121B3B]">Upcoming Alerts</h2>
              <Link
                href="/manager/assets"
                className="rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e293b]"
              >
                View {NOUN[type]}
              </Link>
            </div>
            {alerts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Nothing needs attention right now.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {alerts.map((a, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${ALERT_STYLES[a.level].row}`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: ALERT_STYLES[a.level].dot }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#121B3B]">{a.title}</p>
                      <p className="truncate text-xs text-slate-500">{a.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ))}
    </ManagerPageShell>
  );
}
