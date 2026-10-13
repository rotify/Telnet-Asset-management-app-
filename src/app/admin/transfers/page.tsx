"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createEquipmentTransfer,
  getEquipment,
  getEquipmentTransfers,
} from "@/lib/api";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import type { Equipment } from "@/types/asset";
import type { EquipmentTransfer } from "@/types/workflow";

const EMPTY = { equipment: "", destination: "", department: "", reason: "" };

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<EquipmentTransfer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getEquipmentTransfers(),
      getEquipment().catch(() => [] as Equipment[]),
    ])
      .then(([t, e]) => {
        setTransfers(t);
        setEquipment(e);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load transfers.")
      )
      .finally(() => setIsLoading(false));
  }, []);

  const nameById = useMemo(
    () => new Map(equipment.map((e) => [e.id, e.name])),
    [equipment]
  );
  const label = (t: EquipmentTransfer) =>
    t.equipment_name || nameById.get(t.equipment) || `Equipment #${t.equipment}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transfers.filter((t) => {
      if (equipmentFilter !== "All" && String(t.equipment) !== equipmentFilter)
        return false;
      return (
        !q ||
        `${label(t)} ${t.destination} ${t.department ?? ""} ${t.reason ?? ""}`
          .toLowerCase()
          .includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfers, search, equipmentFilter, nameById]);

  async function handleCreate() {
    setFormError(null);
    if (!form.equipment || !form.destination.trim()) {
      setFormError("Equipment and destination are required.");
      return;
    }
    if (
      !window.confirm(
        "Transfer this equipment? This also updates its assigned user."
      )
    )
      return;
    setIsSaving(true);
    try {
      const created = await createEquipmentTransfer({
        equipment: Number(form.equipment),
        destination: form.destination.trim(),
        department: form.department.trim() || undefined,
        reason: form.reason.trim() || undefined,
      });
      setTransfers((prev) => [created, ...prev]);
      setForm(EMPTY);
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't transfer.");
    } finally {
      setIsSaving(false);
    }
  }

  const input =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none";

  return (
    <AdminPageShell
      title="Equipment Transfers"
      description="Move equipment to a new location or department and keep the history."
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search transfers…"
      actions={
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b]"
        >
          {showForm ? "Cancel" : "+ New Transfer"}
        </button>
      }
    >
      {showForm && (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              className={input}
              value={form.equipment}
              onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
            >
              <option value="">Select equipment…</option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <input
              className={input}
              placeholder="Destination"
              value={form.destination}
              onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
            />
            <input
              className={input}
              placeholder="Department"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
            <textarea
              className={`${input} sm:col-span-3`}
              placeholder="Reason"
              rows={2}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleCreate}
            className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
          >
            {isSaving ? "Transferring…" : "Submit transfer"}
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select className={input} value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)}>
          <option value="All">Equipment: All</option>
          {equipment.map((e) => (
            <option key={e.id} value={String(e.id)}>
              {e.name}
            </option>
          ))}
        </select>
        {(equipmentFilter !== "All" || search) && (
          <button
            type="button"
            onClick={() => {
              setEquipmentFilter("All");
              setSearch("");
            }}
            className="text-sm font-semibold text-telnet-primary hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {isLoading && <p className="mt-6 text-sm text-slate-500">Loading transfers…</p>}
      {!isLoading && !error && filtered.length === 0 && (
        <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          No transfers found.
        </p>
      )}

      {filtered.length > 0 && (
        <div className="mt-6 space-y-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-800">{label(t)}</p>
                <p className="text-xs text-slate-400">
                  {t.created_at ? new Date(t.created_at).toLocaleDateString("en-GB") : ""}
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                → {t.destination}
                {t.department ? ` (${t.department})` : ""}
              </p>
              {t.reason && <p className="mt-1 text-xs text-slate-400">{t.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
