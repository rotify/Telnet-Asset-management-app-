"use client";

import { useEffect, useMemo, useState } from "react";
import { loadMyData } from "@/lib/my-assets";
import { StaffPageShell } from "@/components/layout/staff-page-shell";
import { DataList, EmptyNote } from "@/components/data-list";
import { StatusDot } from "@/components/status-dot";
import {
  expiryLabel,
  expiryTone,
  prettyStatus,
  statusTone,
} from "@/lib/staff-helpers";
import type { Equipment, Vehicle } from "@/types/asset";

export default function StaffAssetsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    loadMyData()
      .then((d) => {
      setVehicles(d.vehicles);
      setEquipment(d.equipment);
      setIsDriver(d.isDriver);
      if (!d.linked)
        setError(
          "We couldn't match your login to a staff profile, so no assets are shown. Ask an admin to link your account."
        );
      else if (d.errors.length)
        setError(`Couldn't load your ${d.errors.join(", ")}.`);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load your data.")
      )
      .finally(() => setIsLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const statusOptions = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set([...vehicles, ...equipment].map((a) => a.status).filter(Boolean))
      ),
    ],
    [vehicles, equipment]
  );
  const vs = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          (statusFilter === "All" || v.status === statusFilter) &&
          (!q ||
          [v.name, v.license_plate, v.make, v.model]
            .join(" ")
            .toLowerCase()
            .includes(q))
      ),
    [vehicles, q, statusFilter]
  );
  const es = useMemo(
    () =>
      equipment.filter(
        (e) =>
          (statusFilter === "All" || e.status === statusFilter) &&
          (!q ||
          [e.name, e.equipment_type, e.serial_number ?? "", e.location ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q))
      ),
    [equipment, q, statusFilter]
  );

  return (
    <StaffPageShell
      title="My Assets"
      description={
        isDriver
          ? "Vehicles and equipment assigned to you."
          : "Equipment assigned to you."
      }
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search my assets..."
    >
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)] sm:flex-row sm:items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
        >
          {statusOptions.map((st) => (
            <option key={st} value={st}>
              Status: {st === "All" ? "All" : prettyStatus(st)}
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
            className="text-sm font-semibold text-red-400 hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          {isDriver && (
          <>
          <h2 className="mt-6 text-sm font-semibold text-[#121B3B]">
            Vehicles ({vs.length})
          </h2>
          {vs.length === 0 ? (
            <EmptyNote>No vehicles assigned to you.</EmptyNote>
          ) : (
            <DataList
              rows={vs}
              rowKey={(v) => v.id}
              viewMode="table"
              columns={[
                { header: "Vehicle", cell: (v) => v.name || `${v.make} ${v.model}` },
                { header: "Plate", cell: (v) => v.license_plate || "—" },
                {
                  header: "Status",
                  cell: (v) => (
                    <StatusDot label={prettyStatus(v.status)} tone={statusTone(v.status)} />
                  ),
                },
                {
                  header: "Insurance",
                  cell: (v) => (
                    <StatusDot
                      label={expiryLabel(v.insurance_expiry)}
                      tone={expiryTone(v.insurance_expiry)}
                    />
                  ),
                },
                {
                  header: "Roadworthy",
                  cell: (v) => (
                    <StatusDot
                      label={expiryLabel(v.roadworthy_expiry)}
                      tone={expiryTone(v.roadworthy_expiry)}
                    />
                  ),
                },
              ]}
              renderCard={(v) => (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#121B3B]">
                    {v.name || `${v.make} ${v.model}`}
                  </p>
                  <p className="text-xs text-slate-400">{v.license_plate || "—"}</p>
                  <StatusDot label={prettyStatus(v.status)} tone={statusTone(v.status)} />
                  <p className="text-xs text-slate-500">
                    Insurance: {expiryLabel(v.insurance_expiry)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Roadworthy: {expiryLabel(v.roadworthy_expiry)}
                  </p>
                </div>
              )}
            />
          )}

          </>
          )}

          <h2 className="mt-8 text-sm font-semibold text-[#121B3B]">
            Equipment ({es.length})
          </h2>
          {es.length === 0 ? (
            <EmptyNote>No equipment assigned to you.</EmptyNote>
          ) : (
            <DataList
              rows={es}
              rowKey={(e) => e.id}
              viewMode="table"
              columns={[
                { header: "Equipment", cell: (e) => e.name },
                { header: "Type", cell: (e) => prettyStatus(e.equipment_type) },
                { header: "Serial No.", cell: (e) => e.serial_number || "—" },
                { header: "Location", cell: (e) => e.location || "—" },
                {
                  header: "Status",
                  cell: (e) => (
                    <StatusDot label={prettyStatus(e.status)} tone={statusTone(e.status)} />
                  ),
                },
              ]}
              renderCard={(e) => (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#121B3B]">{e.name}</p>
                  <p className="text-xs text-slate-400">
                    {prettyStatus(e.equipment_type)} · {e.serial_number || "No serial"}
                  </p>
                  <StatusDot label={prettyStatus(e.status)} tone={statusTone(e.status)} />
                  <p className="text-xs text-slate-500">{e.location || "No location"}</p>
                </div>
              )}
            />
          )}
        </>
      )}
    </StaffPageShell>
  );
}
