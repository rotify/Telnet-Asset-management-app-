"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDocuments, getEquipment, getVehicles } from "@/lib/api";
import { StaffPageShell } from "@/components/layout/staff-page-shell";
import { StatusDot } from "@/components/status-dot";
import { daysUntil, expiryLabel, expiryTone } from "@/lib/staff-helpers";
import type { DocumentRecord } from "@/types/document";
import type { Equipment, Vehicle } from "@/types/asset";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#121B3B]">{value}</p>
    </div>
  );
}

export default function StaffOverviewPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    Promise.allSettled([getVehicles(), getEquipment(), getDocuments()]).then(
      ([v, e, d]) => {
        const errs: string[] = [];
        if (v.status === "fulfilled") setVehicles(v.value);
        else errs.push("vehicles");
        if (e.status === "fulfilled") setEquipment(e.value);
        else errs.push("equipment");
        if (d.status === "fulfilled") setDocuments(d.value);
        else errs.push("documents");
        setErrors(errs);
        setIsLoading(false);
      }
    );
  }, []);

  const expiring = documents
    .filter((d) => {
      const days = daysUntil(d.expiry_date);
      return days !== null && days <= 30;
    })
    .sort(
      (a, b) =>
        new Date(a.expiry_date ?? 0).getTime() -
        new Date(b.expiry_date ?? 0).getTime()
    );

  return (
    <StaffPageShell
      title="Overview"
      description="The vehicles, equipment and documents assigned to you."
    >
      {errors.length > 0 && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load your {errors.join(", ")}. Try reloading the page.
        </p>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="My Vehicles" value={vehicles.length} />
            <Stat label="My Equipment" value={equipment.length} />
            <Stat label="My Documents" value={documents.length} />
            <Stat label="Expiring Soon" value={expiring.length} />
          </div>

          <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Documents Expiring Soon
            </h2>
            {expiring.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                Nothing expires in the next 30 days.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {expiring.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#121B3B]">
                        {d.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {d.document_type}
                      </p>
                    </div>
                    <StatusDot
                      label={expiryLabel(d.expiry_date)}
                      tone={expiryTone(d.expiry_date)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <div>
              <h2 className="text-sm font-semibold text-[#121B3B]">
                Something broken or unsafe?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Send an emergency maintenance request to the admin team.
              </p>
            </div>
            <Link
              href="/dashboard/report-issue"
              className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b]"
            >
              Report an Issue
            </Link>
          </div>
        </>
      )}
    </StaffPageShell>
  );
}
