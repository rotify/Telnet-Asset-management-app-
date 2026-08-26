"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import {
  createEquipmentMaintenance,
  deleteEquipmentMaintenance,
  getEquipment,
  getEquipmentMaintenance,
  updateEquipmentMaintenance,
} from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { ThreeDotMenu, MenuItem } from "@/components/three-dot-menu";
import type { Equipment } from "@/types/asset";
import type { MaintenanceRecord } from "@/types/maintenance";

function RecordActions({
  onEdit,
  onDelete,
  deleteLabel,
}: {
  onEdit: () => void;
  onDelete: () => Promise<void>;
  deleteLabel: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClickDelete(close: () => void) {
    if (
      !window.confirm(
        `Delete the maintenance record for ${deleteLabel}? This can't be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete record.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ThreeDotMenu>
      {(close) => (
        <div>
          <MenuItem
            onClick={() => {
              onEdit();
              close();
            }}
          >
            Edit
          </MenuItem>
          <MenuItem onClick={() => handleClickDelete(close)} tone="danger">
            {deleting ? "Deleting…" : "Delete"}
          </MenuItem>
          {error && <p className="mt-1 px-3 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </ThreeDotMenu>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB");
}

function dueStatus(dueDate: string | null): { label: string; tone: StatusTone } {
  if (!dueDate) return { label: "No due date", tone: "slate" };
  const days = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / 86400000
  );
  if (Number.isNaN(days)) return { label: "No due date", tone: "slate" };
  if (days < 0) return { label: "Overdue", tone: "red" };
  if (days <= 14) return { label: "Due Soon", tone: "orange" };
  return { label: "Scheduled", tone: "green" };
}

function priorityFromDue(dueDate: string | null): { label: string; tone: StatusTone } {
  if (!dueDate) return { label: "Low", tone: "slate" };
  const days = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / 86400000
  );
  if (Number.isNaN(days)) return { label: "Low", tone: "slate" };
  if (days < 0) return { label: "High", tone: "red" };
  if (days <= 14) return { label: "Medium", tone: "orange" };
  return { label: "Low", tone: "slate" };
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
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Overdue" | "Due Soon" | "Scheduled" | "No due date"
  >("All");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState(EMPTY_NEW_RECORD);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_NEW_RECORD);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const equipmentById = useMemo(() => {
    const map = new Map<number, Equipment>();
    equipment.forEach((e) => map.set(e.id, e));
    return map;
  }, [equipment]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const eqName = equipmentNameById.get(r.equipment) ?? "";
      const matchesSearch =
        !q ||
        r.description?.toLowerCase().includes(q) ||
        eqName.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "All" || dueStatus(r.due_date).label === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter, equipmentNameById]);

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

  function startEdit(r: MaintenanceRecord) {
    setEditingId(r.id);
    setEditForm({
      equipment: String(r.equipment),
      description: r.description ?? "",
      due_date: r.due_date ?? "",
      cost: r.cost ?? "",
      notes: r.notes ?? "",
    });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit() {
    if (editingId == null) return;
    setEditError(null);
    if (
      !editForm.equipment ||
      !editForm.description.trim() ||
      !editForm.due_date
    ) {
      setEditError("Equipment, description, and due date are required.");
      return;
    }
    setIsSavingEdit(true);
    try {
      const updated = await updateEquipmentMaintenance(editingId, {
        equipment: Number(editForm.equipment),
        description: editForm.description,
        due_date: editForm.due_date,
        cost: editForm.cost || undefined,
        notes: editForm.notes || undefined,
      });
      setRecords((prev) =>
        prev.map((r) => (r.id === editingId ? updated : r))
      );
      setEditingId(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Couldn't update maintenance record."
      );
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteRecord(id: number) {
    await deleteEquipmentMaintenance(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  function handleExport() {
    const rows = [
      ["Machine Name", "Office location", "Category", "Report Name", "Priority", "Status"],
      ...records.map((r) => {
        const eq = equipmentById.get(r.equipment);
        const priority = priorityFromDue(r.due_date);
        const status = dueStatus(r.due_date);
        return [
          equipmentNameById.get(r.equipment) ?? `Equipment #${r.equipment}`,
          eq?.regional_office || eq?.subsidiary || "",
          eq?.equipment_type || "",
          r.description,
          priority.label,
          status.label,
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maintenance.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <AdminTopBar />

          <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">
                Maintenance Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Store and manage important company files such as insurance
                certificates, licenses, warranties, and receipts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm((v) => !v);
                  setAddError(null);
                }}
                className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover"
              >
                {showAddForm ? "Cancel" : "+ Upload"}
              </button>
            </div>
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
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
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
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <input
                  type="date"
                  value={newRecord.due_date}
                  onChange={(e) =>
                    setNewRecord((v) => ({ ...v, due_date: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Cost (e.g. 150.00)"
                  value={newRecord.cost}
                  onChange={(e) =>
                    setNewRecord((v) => ({ ...v, cost: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Notes"
                  value={newRecord.notes}
                  onChange={(e) =>
                    setNewRecord((v) => ({ ...v, notes: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none sm:col-span-2"
                />
              </div>
              {addError && (
                <p className="mt-2 text-sm text-red-600">{addError}</p>
              )}
              <button
                type="button"
                onClick={handleAdd}
                disabled={isAdding}
                className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
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
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-telnet-primary focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | "All"
                    | "Overdue"
                    | "Due Soon"
                    | "Scheduled"
                    | "No due date"
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
            >
              <option value="All">Status: All</option>
              <option value="Overdue">Status: Overdue</option>
              <option value="Due Soon">Status: Due Soon</option>
              <option value="Scheduled">Status: Scheduled</option>
              <option value="No due date">Status: No due date</option>
            </select>
            {(search || statusFilter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                }}
                className="text-sm font-semibold text-telnet-primary hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          {isLoading && !error && (
            <p className="mt-6 text-sm text-slate-500">
              Loading maintenance records…
            </p>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              No maintenance records match your search.
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="mt-6 space-y-3 md:hidden">
              {filtered.map((r) => {
                const status = dueStatus(r.due_date);
                const priority = priorityFromDue(r.due_date);
                const eq = equipmentById.get(r.equipment);

                if (editingId === r.id) {
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
                    >
                      <p className="text-sm font-semibold text-[#121B3B]">
                        Edit maintenance record
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select
                          value={editForm.equipment}
                          onChange={(e) =>
                            setEditForm((v) => ({
                              ...v,
                              equipment: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
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
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((v) => ({
                              ...v,
                              description: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                        />
                        <input
                          type="date"
                          value={editForm.due_date}
                          onChange={(e) =>
                            setEditForm((v) => ({
                              ...v,
                              due_date: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Cost (e.g. 150.00)"
                          value={editForm.cost}
                          onChange={(e) =>
                            setEditForm((v) => ({ ...v, cost: e.target.value }))
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Notes"
                          value={editForm.notes}
                          onChange={(e) =>
                            setEditForm((v) => ({
                              ...v,
                              notes: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none sm:col-span-2"
                        />
                      </div>
                      {editError && (
                        <p className="mt-2 text-sm text-red-600">
                          {editError}
                        </p>
                      )}
                      <div className="mt-3 flex gap-3">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={isSavingEdit}
                          className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
                        >
                          {isSavingEdit ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-sm font-medium text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={r.id}
                    className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {equipmentNameById.get(r.equipment) ??
                            `Equipment #${r.equipment}`}
                        </p>
                        <p className="text-xs text-slate-400">
                          {r.description}
                        </p>
                      </div>
                      <StatusDot
                        label={status.label}
                        tone={status.tone}
                        className="shrink-0"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <p className="text-slate-400">Office location</p>
                        <p className="text-slate-700">
                          {eq?.regional_office || eq?.subsidiary || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Category</p>
                        <p className="text-slate-700">
                          {eq?.equipment_type || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Due Date</p>
                        <p className="text-slate-700">
                          {formatDate(r.due_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Priority</p>
                        <StatusDot label={priority.label} tone={priority.tone} />
                      </div>
                      <div>
                        <p className="text-slate-400">Cost</p>
                        <p className="text-slate-700">
                          {r.cost ? `₦${r.cost}` : "—"}
                        </p>
                      </div>
                      {r.notes && (
                        <div className="col-span-2">
                          <p className="text-slate-400">Notes</p>
                          <p className="text-slate-700">{r.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex justify-end border-t border-slate-100 pt-2">
                      <RecordActions
                        onEdit={() => startEdit(r)}
                        onDelete={() => handleDeleteRecord(r.id)}
                        deleteLabel={
                          equipmentNameById.get(r.equipment) ?? "this record"
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="mt-6 hidden overflow-x-auto rounded-xl bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06)] md:block">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-blue-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Machine Name</th>
                    <th className="px-4 py-3">Office location</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Report Name</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-slate-400"
                      >
                        No maintenance records match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const status = dueStatus(r.due_date);
                      const priority = priorityFromDue(r.due_date);
                      const eq = equipmentById.get(r.equipment);

                      if (editingId === r.id) {
                        return (
                          <tr key={r.id} className="border-b border-slate-50 last:border-0">
                            <td colSpan={7} className="px-4 py-4">
                              <p className="text-sm font-semibold text-[#121B3B]">
                                Edit maintenance record
                              </p>
                              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <select
                                  value={editForm.equipment}
                                  onChange={(e) =>
                                    setEditForm((v) => ({
                                      ...v,
                                      equipment: e.target.value,
                                    }))
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
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
                                  value={editForm.description}
                                  onChange={(e) =>
                                    setEditForm((v) => ({
                                      ...v,
                                      description: e.target.value,
                                    }))
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                                />
                                <input
                                  type="date"
                                  value={editForm.due_date}
                                  onChange={(e) =>
                                    setEditForm((v) => ({
                                      ...v,
                                      due_date: e.target.value,
                                    }))
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                                />
                                <input
                                  type="text"
                                  placeholder="Cost (e.g. 150.00)"
                                  value={editForm.cost}
                                  onChange={(e) =>
                                    setEditForm((v) => ({
                                      ...v,
                                      cost: e.target.value,
                                    }))
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                                />
                                <input
                                  type="text"
                                  placeholder="Notes"
                                  value={editForm.notes}
                                  onChange={(e) =>
                                    setEditForm((v) => ({
                                      ...v,
                                      notes: e.target.value,
                                    }))
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none sm:col-span-2"
                                />
                              </div>
                              {editError && (
                                <p className="mt-2 text-sm text-red-600">
                                  {editError}
                                </p>
                              )}
                              <div className="mt-3 flex gap-3">
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  disabled={isSavingEdit}
                                  className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
                                >
                                  {isSavingEdit ? "Saving…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="text-sm font-medium text-slate-500 hover:text-slate-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

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
                            {eq?.regional_office || eq?.subsidiary || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {eq?.equipment_type || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {r.description}
                          </td>
                          <td className="px-4 py-3">
                            <StatusDot label={priority.label} tone={priority.tone} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusDot label={status.label} tone={status.tone} />
                          </td>
                          <td className="px-4 py-3">
                            <RecordActions
                              onEdit={() => startEdit(r)}
                              onDelete={() => handleDeleteRecord(r.id)}
                              deleteLabel={
                                equipmentNameById.get(r.equipment) ??
                                "this record"
                              }
                            />
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
