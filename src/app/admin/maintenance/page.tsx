"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import {
  createEquipmentMaintenance,
  getEquipment,
  getEquipmentMaintenance,
} from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import type { Equipment } from "@/types/asset";
import type { MaintenanceRecord } from "@/types/maintenance";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB");
}

function dueStatus(dueDate: string | null): { label: string; tone: string } {
  if (!dueDate) return { label: "No due date", tone: "bg-slate-100 text-slate-500" };
  const days = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / 86400000
  );
  if (Number.isNaN(days)) return { label: "No due date", tone: "bg-slate-100 text-slate-500" };
  if (days < 0) return { label: "Overdue", tone: "bg-red-50 text-red-700" };
  if (days <= 14) return { label: "Due Soon", tone: "bg-amber-50 text-amber-700" };
  return { label: "Scheduled", tone: "bg-green-50 text-green-700" };
}

const EMPTY_NEW_RECORD = {
  equipment: "",
  description: "",
  due_date: "",
  cost: "",
  notes: "",
};

export default function MaintenancePage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState(EMPTY_NEW_RECORD);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

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
    setGateChecked(true);
  }, [router]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [maintenance, eq] = await Promise.all([
        getEquipmentMaintenance(),
        getEquipment(),
      ]);
      setRecords(maintenance);
      setEquipment(eq);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't load maintenance records."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!gateChecked) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateChecked]);

  const equipmentNameById = useMemo(() => {
    const map = new Map<number, string>();
    equipment.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [equipment]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const eqName = equipmentNameById.get(r.equipment) ?? "";
      return (
        r.description?.toLowerCase().includes(q) ||
        eqName.toLowerCase().includes(q)
      );
    });
  }, [records, search, equipmentNameById]);

  async function handleAdd() {
    setAddError(null);
    if (!newRecord.equipment || !newRecord.description.trim() || !newRecord.due_date) {
      setAddError("Equipment, description, and due date are required.");
      return;
    }
    setIsAdding(true);
    try {
      const created = await createEquipmentMaintenance({
        equipment: Number(newRecord.equipment),
        description: newRecord.description,
        due_date: newRecord.due_date,
        cost: newRecord.cost || undefined,
        notes: newRecord.notes || undefined,
      });
      setRecords((prev) => [created, ...prev]);
      setNewRecord(EMPTY_NEW_RECORD);
      setShowAddForm(false);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Couldn't create maintenance record."
      );
    } finally {
      setIsAdding(false);
    }
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">
                Maintenance
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Live equipment maintenance records from the backend.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddForm((v) => !v);
                setAddError(null);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {showAddForm ? "Cancel" : "+ Schedule Maintenance"}
            </button>
          </header>

          {showAddForm && (
            <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              <p className="text-sm font-semibold text-[#121B3B]">
                New maintenance record
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <select
                  value={newRecord.equipment}
                  onChange={(e) =>
                    setNewRecord((v) => ({ ...v, equipment: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="">Select equipment…</option>
                  {equipment.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Description"
                  value={newRecord.description}
                  onChange={(e) =>
                    setNewRecord((v) => ({ ...v, description: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="date"
                  value={newRecord.due_date}
                  onChange={(e) =>
                    setNewRecord((v) => ({ ...v, due_date: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Cost (e.g. 150.00)"
                  value={newRecord.cost}
                  onChange={(e) =>
                    setNewRecord((v) => ({ ...v, cost: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Notes"
                  value={newRecord.notes}
                  onChange={(e) =>
                    setNewRecord((v) => ({ ...v, notes: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none sm:col-span-2"
                />
              </div>
              {addError && (
                <p className="mt-2 text-sm text-red-600">{addError}</p>
              )}
              <button
                type="button"
                onClick={handleAdd}
                disabled={isAdding}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isAdding ? "Saving…" : "Save record"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadData}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="mt-6 max-w-sm">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by equipment or description…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {isLoading && !error && (
            <p className="mt-6 text-sm text-slate-500">
              Loading maintenance records…
            </p>
          )}

          {!isLoading && !error && (
            <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-blue-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Equipment</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-slate-400"
                      >
                        No maintenance records match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const status = dueStatus(r.due_date);
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {equipmentNameById.get(r.equipment) ??
                              `Equipment #${r.equipment}`}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {r.description}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatDate(r.due_date)}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {r.cost ? `₦${r.cost}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {r.notes || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${status.tone}`}
                            >
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
