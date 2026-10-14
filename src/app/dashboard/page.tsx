"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadMyData } from "@/lib/my-assets";
import { StaffPageShell } from "@/components/layout/staff-page-shell";
import { daysUntil, expiryLabel, prettyStatus } from "@/lib/staff-helpers";
import type { DocumentRecord } from "@/types/document";
import type { Equipment, Vehicle } from "@/types/asset";

const ALERT_STYLES = {
  critical: { row: "border-[#F3B3B6] bg-[#FDEEEF]", icon: "#FD7072" },
  warning: { row: "border-[#F4D199] bg-[#FCF3E5]", icon: "#F6AD3F" },
} as const;

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
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
  value: number;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F6FA] text-telnet-primary">
          {icon}
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="text-xl font-bold text-[#121B3B]">{value}</p>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

interface Alert {
  level: "critical" | "warning";
  title: string;
  sub: string;
}

const VEHICLE_CHECKS: [keyof Vehicle, string][] = [
  ["insurance_expiry", "Insurance"],
  ["roadworthy_expiry", "Roadworthiness"],
  ["license_expiry", "Licence"],
  ["hackney_permit", "Hackney permit"],
];

export default function StaffOverviewPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const [linked, setLinked] = useState(true);

  useEffect(() => {
    loadMyData().then((d) => {
      setVehicles(d.vehicles);
      setEquipment(d.equipment);
      setDocuments(d.documents);
      setErrors(d.errors);
      setLinked(d.linked);
      setIsLoading(false);
    });
  }, []);

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    for (const d of documents) {
      const days = daysUntil(d.expiry_date);
      if (days === null || days > 30) continue;
      out.push({
        level: days < 0 ? "critical" : "warning",
        title: days < 0 ? `${d.name} has expired` : `${d.name} expires soon`,
        sub: `${d.document_type || "Document"} · ${expiryLabel(d.expiry_date)}`,
      });
    }
    for (const v of vehicles) {
      for (const [key, label] of VEHICLE_CHECKS) {
        const date = v[key];
        if (typeof date !== "string") continue;
        const days = daysUntil(date);
        if (days === null || days > 30) continue;
        out.push({
          level: days < 0 ? "critical" : "warning",
          title: `${v.license_plate || v.name} – ${label} ${
            days < 0 ? "expired" : "expiring"
          }`,
          sub: `Vehicle · ${expiryLabel(date)}`,
        });
      }
    }
    for (const e of equipment) {
      if (e.status === "damaged")
        out.push({
          level: "critical",
          title: `${e.name} is damaged`,
          sub: "Equipment · report it so it can be repaired",
        });
    }
    return out.sort((a) => (a.level === "critical" ? -1 : 1));
  }, [documents, vehicles, equipment]);

  const q = search.trim().toLowerCase();
  const shownAlerts = alerts.filter(
    (a) => !q || `${a.title} ${a.sub}`.toLowerCase().includes(q)
  );

  // Status breakdown of everything assigned to the user.
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    [...vehicles, ...equipment].forEach((a) => {
      const k = prettyStatus(a.status);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [vehicles, equipment]);
  const totalAssets = vehicles.length + equipment.length;

  return (
    <StaffPageShell
      title="My Dashboard"
      uppercase
      description="Monitor the vehicles, equipment and documents assigned to you."
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search alerts..."
    >
      {errors.length > 0 && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load your {errors.join(", ")}. Try reloading the page.
        </p>
      )}

      {!isLoading && !linked && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          We couldn&apos;t match your login to a staff profile, so no assets
          are shown. Ask an admin to link your account.
        </p>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Total Assets"
              value={totalAssets}
              hint="Everything assigned to you"
              icon={
                <Icon>
                  <path d="M12 3 3 8l9 5 9-5-9-5Z" />
                  <path d="m3 13 9 5 9-5" />
                </Icon>
              }
            />
            <StatCard
              label="My Vehicles"
              value={vehicles.length}
              hint="Company vehicles and status"
              icon={
                <Icon>
                  <path d="M5 16V11l2-5h10l2 5v5" />
                  <circle cx="8" cy="17" r="1.5" />
                  <circle cx="16" cy="17" r="1.5" />
                </Icon>
              }
            />
            <StatCard
              label="My Equipment"
              value={equipment.length}
              hint="Equipment in your care"
              icon={
                <Icon>
                  <rect x="4" y="7" width="16" height="12" rx="2" />
                  <path d="M9 7V5h6v2" />
                </Icon>
              }
            />
            <StatCard
              label="My Documents"
              value={documents.length}
              hint="Licences, permits and certificates"
              icon={
                <Icon>
                  <path d="M3 8a2 2 0 0 1 2-2h11l5 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                </Icon>
              }
            />
          </div>

          <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="text-sm font-semibold text-[#121B3B]">Assets Status</h2>
            {statusCounts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No assets assigned to you.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {statusCounts.map(([label, count]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{label}</span>
                      <span>{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-[#121B3B]"
                        style={{ width: `${(count / totalAssets) * 100}%` }}
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
                href="/dashboard/report-issue"
                className="rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e293b]"
              >
                Report an Issue
              </Link>
            </div>
            {shownAlerts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Nothing needs attention right now.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {shownAlerts.map((a, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${ALERT_STYLES[a.level].row}`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: ALERT_STYLES[a.level].icon }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#121B3B]">
                        {a.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">{a.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </StaffPageShell>
  );
}
