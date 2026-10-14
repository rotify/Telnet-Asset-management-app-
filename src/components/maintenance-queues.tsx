"use client";

import { useEffect, useState } from "react";
import {
  getEquipment,
  getEquipmentMaintenance,
  getMaintenanceDue,
  getMaintenanceRequests,
  getVehicles,
  type MaintenanceDueItem,
  type MaintenanceRequest,
} from "@/lib/api";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { prettify } from "@/lib/work-orders";

// The due/requests payloads aren't fully documented yet, so read the
// first populated field from a list of likely names.
function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return "";
}

const STATUS_TONE: Record<string, StatusTone> = {
  overdue: "red",
  upcoming: "orange",
  due_soon: "orange",
  ok: "green",
};

const SOON_DAYS = 30;

function dueStatus(date: string): "overdue" | "due_soon" | null {
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  const days = Math.floor((t - Date.now()) / 86_400_000);
  if (days < 0) return "overdue";
  return days <= SOON_DAYS ? "due_soon" : null;
}

// Fallback when /maintenance/due/ is unavailable or empty: work out what
// needs attention from the app's own data (open maintenance records and
// vehicle compliance expiries).
async function deriveDue(): Promise<MaintenanceDueItem[]> {
  const [records, equipment, vehicles] = await Promise.all([
    getEquipmentMaintenance().catch(() => []),
    getEquipment().catch(() => []),
    getVehicles().catch(() => []),
  ]);
  const eqName = new Map(equipment.map((e) => [e.id, e.name]));
  const out: MaintenanceDueItem[] = [];

  for (const r of records) {
    if (r.maintenance_date || !r.due_date) continue;
    const status = dueStatus(r.due_date);
    if (status)
      out.push({
        name: eqName.get(r.equipment) ?? r.description,
        type: "equipment",
        due_date: r.due_date,
        status,
      });
  }
  for (const e of equipment) {
    if (e.status === "damaged")
      out.push({ name: e.name, type: "equipment", status: "overdue", due_date: "" });
  }
  const checks: [keyof (typeof vehicles)[number], string][] = [
    ["insurance_expiry", "Insurance"],
    ["roadworthy_expiry", "Roadworthiness"],
    ["license_expiry", "Licence"],
    ["hackney_permit", "Hackney permit"],
  ];
  for (const v of vehicles) {
    for (const [key, label] of checks) {
      const date = v[key];
      if (typeof date !== "string" || !date) continue;
      const status = dueStatus(date);
      if (status)
        out.push({
          name: `${v.license_plate || v.name} – ${label}`,
          type: "vehicle",
          due_date: date,
          status,
        });
    }
  }
  return out;
}

function Card({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
        {title}
        {count !== undefined && (
          <span className="ml-2 font-normal text-slate-400">({count})</span>
        )}
      </h2>
      {children}
    </div>
  );
}

// Admin-only queues: assets with a maintenance due date, and emergency
// requests submitted by staff / drivers.
export function MaintenanceQueues() {
  const [due, setDue] = useState<MaintenanceDueItem[] | null>(null);
  const [dueError, setDueError] = useState<string | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[] | null>(null);
  const [reqError, setReqError] = useState<string | null>(null);

  const [derived, setDerived] = useState(false);

  useEffect(() => {
    getMaintenanceDue()
      .then((list) => {
        if (list.length > 0) return setDue(list);
        return deriveDue().then((d) => {
          setDerived(true);
          setDue(d);
        });
      })
      .catch(() =>
        deriveDue()
          .then((d) => {
            setDerived(true);
            setDue(d);
          })
          .catch((e) =>
            setDueError(
              e instanceof Error ? e.message : "Couldn't load due assets."
            )
          )
      );
    getMaintenanceRequests()
      .then(setRequests)
      .catch((e) =>
        setReqError(
          e instanceof Error ? e.message : "Couldn't load emergency requests."
        )
      );
  }, []);

  return (
    <>
      <Card title="Maintenance Due" count={due?.length}>
        {dueError ? (
          <p className="mt-4 text-sm text-red-600">{dueError}</p>
        ) : due === null ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : due.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            No assets have maintenance coming up.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {derived && (
              <li className="pb-2 text-xs text-slate-400">
                Calculated from due and expiry dates (next {SOON_DAYS} days
                and overdue).
              </li>
            )}
            {due.map((d, i) => {
              const status = pick(d, ["status", "due_status", "maintenance_status"]);
              return (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#121B3B]">
                      {pick(d, ["name", "asset_name", "license_plate", "asset"]) ||
                        "Asset"}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {prettify(pick(d, ["type", "asset_type", "kind"])) || "Asset"}
                      {pick(d, ["maintenance_due_date", "due_date"])
                        ? ` · Due ${pick(d, ["maintenance_due_date", "due_date"]).slice(0, 10)}`
                        : ""}
                    </p>
                  </div>
                  {status && (
                    <StatusDot
                      label={prettify(status)}
                      tone={STATUS_TONE[status.toLowerCase()] ?? "slate"}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Emergency Requests" count={requests?.length}>
        {reqError ? (
          <p className="mt-4 text-sm text-red-600">{reqError}</p>
        ) : requests === null ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            No emergency requests.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {requests.map((r, i) => (
              <li
                key={r.id ?? i}
                className="flex flex-wrap items-start justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#121B3B]">
                    {r.asset_description || "Asset"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.issue_description}
                  </p>
                  <p className="text-xs text-slate-400">
                    {pick(r, ["submitted_by", "requested_by", "user"])}
                    {r.created_at
                      ? ` · ${new Date(r.created_at).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                {r.photo && (
                  <a
                    href={r.photo}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-telnet-primary hover:underline"
                  >
                    View photo
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
