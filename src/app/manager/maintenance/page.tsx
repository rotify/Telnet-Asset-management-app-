"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createEquipmentMaintenance,
  createVehicleMaintenance,
  getEquipment,
  getEquipmentMaintenance,
  getVehicleMaintenance,
  getVehicles,
} from "@/lib/api";
import { ManagerPageShell } from "@/components/layout/manager-page-shell";
import { DataList } from "@/components/data-list";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { useManagerContext } from "@/lib/manager";
import { daysUntil, fmtDate } from "@/lib/staff-helpers";

interface Row {
  id: number;
  asset: string;
  description: string;
  due: string | null;
  done: string | null;
  cost: string | null;
}

const inputClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-telnet-primary focus:outline-none";

function state(r: Row): { label: string; tone: StatusTone } {
  if (r.done) return { label: "Done", tone: "green" };
  const d = daysUntil(r.due);
  if (d === null) return { label: "Open", tone: "slate" };
  if (d < 0) return { label: "Overdue", tone: "red" };
  return d <= 30 ? { label: "Due soon", tone: "orange" } : { label: "Scheduled", tone: "navy" };
}

export default function ManagerMaintenancePage() {
  const { type } = useManagerContext();
  const isVehicles = type === "vehicles";
  const [rows, setRows] = useState<Row[]>([]);
  const [assets, setAssets] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({ asset: "", description: "", due: "", cost: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (type !== "equipment" && type !== "vehicles") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const run = async () => {
      if (type === "equipment") {
        const [records, eq] = await Promise.all([getEquipmentMaintenance(), getEquipment().catch(() => [])]);
        const names = new Map(eq.map((e) => [e.id, e.name]));
        setAssets(eq.map((e) => ({ id: e.id, name: e.name })));
        setRows(
          records.map((r) => ({
            id: r.id,
            asset: names.get(r.equipment) ?? `Equipment #${r.equipment}`,
            description: r.description,
            due: r.due_date,
            done: r.maintenance_date,
            cost: r.cost,
          }))
        );
      } else {
        const [records, vs] = await Promise.all([getVehicleMaintenance(), getVehicles().catch(() => [])]);
        setAssets(vs.map((v) => ({ id: v.id, name: v.license_plate ? `${v.name} (${v.license_plate})` : v.name })));
        setRows(
          records.map((r) => ({
            id: r.id,
            asset: r.vehicle_name ?? `Vehicle #${r.vehicle}`,
            description: r.description,
            due: r.due_date ?? null,
            done: r.maintenance_date ?? null,
            cost: r.cost,
          }))
        );
      }
    };
    run()
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load maintenance."))
      .finally(() => setLoading(false));
  }, [type, reloadKey]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(
    () =>
      rows
        .filter((r) => !q || `${r.asset} ${r.description}`.toLowerCase().includes(q))
        .sort((a, b) => Number(!!a.done) - Number(!!b.done)),
    [rows, q]
  );
  const dueCount = rows.filter((r) => ["Overdue", "Due soon"].includes(state(r).label)).length;

  async function submit() {
    setFormError(null);
    if (!form.asset || !form.description.trim() || (!isVehicles && !form.due)) {
      setFormError(
        isVehicles
          ? "Choose a vehicle and describe the work."
          : "Choose equipment, describe the work and set a due date."
      );
      return;
    }
    setSaving(true);
    try {
      if (isVehicles) {
        await createVehicleMaintenance({
          vehicle: Number(form.asset),
          description: form.description.trim(),
          cost: form.cost || undefined,
          due_date: form.due || undefined,
        });
      } else {
        await createEquipmentMaintenance({
          equipment: Number(form.asset),
          description: form.description.trim(),
          due_date: form.due,
          cost: form.cost || undefined,
        });
      }
      setForm({ asset: "", description: "", due: "", cost: "" });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save the record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ManagerPageShell
      title="Maintenance"
      description={`Maintenance records for the ${isVehicles ? "vehicles" : "equipment"} you manage.`}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search maintenance…"
    >
      <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
        <h2 className="text-sm font-semibold text-[#121B3B]">Log maintenance record</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select value={form.asset} onChange={(e) => setForm((f) => ({ ...f, asset: e.target.value }))} className={inputClasses}>
            <option value="">{isVehicles ? "Select vehicle" : "Select equipment"}</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What needs doing?"
            className={`${inputClasses} sm:col-span-2`}
          />
          <input
            type="date"
            value={form.due}
            onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
            className={inputClasses}
          />
          <input
            value={form.cost}
            onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
            placeholder="Cost (optional)"
            className={inputClasses}
          />
        </div>
        {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save record"}
        </button>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        {dueCount} item{dueCount === 1 ? "" : "s"} overdue or due within 30 days.
      </p>
      {loading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {!loading && !error && shown.length === 0 && (
        <p className="mt-3 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          No maintenance records.
        </p>
      )}
      {shown.length > 0 && (
        <DataList<Row>
          rows={shown}
          rowKey={(r) => r.id}
          viewMode="table"
          columns={[
            { header: isVehicles ? "Vehicle" : "Equipment", cell: (r) => <span className="font-semibold text-slate-800">{r.asset}</span> },
            { header: "Work", cell: (r) => <span className="text-slate-600">{r.description}</span> },
            { header: "Due", cell: (r) => <span className="text-slate-500">{fmtDate(r.due)}</span> },
            { header: "Done", cell: (r) => <span className="text-slate-500">{fmtDate(r.done)}</span> },
            { header: "Cost", cell: (r) => <span className="text-slate-500">{r.cost || "—"}</span> },
            { header: "Status", cell: (r) => <StatusDot label={state(r).label} tone={state(r).tone} /> },
          ]}
          renderCard={(r) => (
            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-800">{r.asset}</p>
                <StatusDot label={state(r).label} tone={state(r).tone} />
              </div>
              <p className="mt-1 text-sm text-slate-600">{r.description}</p>
              <p className="mt-1 text-xs text-slate-500">Due {fmtDate(r.due)}</p>
            </div>
          )}
        />
      )}
    </ManagerPageShell>
  );
}
