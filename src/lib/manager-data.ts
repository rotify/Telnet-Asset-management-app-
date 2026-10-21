"use client";

import { useEffect, useState } from "react";
import { getDocuments, getEquipment, getVehicles } from "@/lib/api";
import type { ManagerType } from "@/lib/manager";
import type { Equipment, Vehicle } from "@/types/asset";
import type { DocumentRecord } from "@/types/document";
import { daysUntil, docStatus, prettyStatus } from "@/lib/staff-helpers";

export interface ManagedAssets {
  loading: boolean;
  error: string | null;
  equipment: Equipment[];
  vehicles: Vehicle[];
  documents: DocumentRecord[];
}

// Loads only what this manager looks after.
export function useManagedAssets(type: ManagerType | null): ManagedAssets {
  const [state, setState] = useState<ManagedAssets>({
    loading: true,
    error: null,
    equipment: [],
    vehicles: [],
    documents: [],
  });

  useEffect(() => {
    if (!type) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const load =
      type === "equipment"
        ? getEquipment().then((equipment) => ({ equipment }))
        : type === "vehicles"
        ? getVehicles().then((vehicles) => ({ vehicles }))
        : getDocuments().then((documents) => ({ documents }));
    load
      .then((part) => setState((s) => ({ ...s, ...part, loading: false })))
      .catch((err) =>
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Couldn't load assets.",
        }))
      );
  }, [type]);

  return state;
}

export interface Counts {
  total: number;
  buckets: [string, number][];
}

// Status counts shown as dashboard cards.
export function summarise(type: ManagerType, d: ManagedAssets): Counts {
  const tally = (labels: string[]) => {
    const m = new Map<string, number>();
    labels.forEach((l) => m.set(l, (m.get(l) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };
  if (type === "equipment")
    return {
      total: d.equipment.length,
      buckets: tally(d.equipment.map((e) => prettyStatus(e.status))),
    };
  if (type === "vehicles")
    return {
      total: d.vehicles.length,
      buckets: tally(d.vehicles.map((v) => prettyStatus(v.status))),
    };
  return {
    total: d.documents.length,
    buckets: tally(d.documents.map((x) => docStatus(x.expiry_date))),
  };
}

export interface ManagerAlert {
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

export function buildAlerts(type: ManagerType, d: ManagedAssets): ManagerAlert[] {
  const out: ManagerAlert[] = [];
  const add = (days: number | null, title: string, sub: string, verb: string) => {
    if (days === null || days > 30) return;
    out.push({
      level: days < 0 ? "critical" : "warning",
      title: `${title} ${days < 0 ? "expired" : verb}`,
      sub,
    });
  };
  if (type === "vehicles")
    for (const v of d.vehicles)
      for (const [key, label] of VEHICLE_CHECKS) {
        const date = v[key];
        if (typeof date === "string")
          add(daysUntil(date), `${v.license_plate || v.name}: ${label}`, `Vehicle · ${date}`, "expiring");
      }
  if (type === "equipment")
    for (const e of d.equipment) {
      add(daysUntil(e.warranty_expiry), `${e.name}: warranty`, `Equipment · ${e.warranty_expiry}`, "expiring");
      if (e.status === "damaged")
        out.push({ level: "critical", title: `${e.name} is damaged`, sub: "Equipment · needs repair" });
    }
  if (type === "documents")
    for (const x of d.documents)
      add(daysUntil(x.expiry_date), x.name, `${x.document_type} · ${x.expiry_date}`, "expiring");
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "critical" ? -1 : 1));
}
