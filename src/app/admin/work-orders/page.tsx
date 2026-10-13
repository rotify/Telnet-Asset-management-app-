"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createEquipmentWorkOrder,
  deleteEquipmentWorkOrder,
  getEquipment,
  getEquipmentWorkOrders,
  updateEquipmentWorkOrder,
} from "@/lib/api";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { prettify, workOrderLevel } from "@/lib/work-orders";
import type { Equipment } from "@/types/asset";
import type { WorkOrder } from "@/types/work-order";

const STATUSES = ["open", "in_progress", "completed", "cancelled"];
const PRIORITIES = ["low", "medium", "high"];
const WORK_TYPES = ["repair", "certification", "inspection"];
const TONE: Record<string, StatusTone> = {
  critical: "red",
  warning: "orange",
  info: "slate",
};
const EMPTY = {
  equipment: "",
  work_type: "repair",
  title: "",
  description: "",
  priority: "medium",
  due_date: "",
};

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    setIsLoading(true);
    Promise.all([
      getEquipmentWorkOrders(),
      getEquipment().catch(() => [] as Equipment[]),
    ])
      .then(([o, e]) => {
        setOrders(o);
        setEquipment(e);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load work orders.")
      )
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "All" && o.status !== statusFilter) return false;
      if (priorityFilter !== "All" && o.priority !== priorityFilter) return false;
      return (
        !q ||
        `${o.equipment_name} ${o.title ?? ""} ${o.work_type} ${o.notes ?? ""}`
          .toLowerCase()
          .includes(q)
      );
    });
  }, [orders, search, statusFilter, priorityFilter]);

  async function handleCreate() {
    setFormError(null);
    if (!form.equipment || !form.title.trim()) {
      setFormError("Equipment and title are required.");
      return;
    }
    setIsSaving(true);
    try {
      const created = await createEquipmentWorkOrder({
        equipment: Number(form.equipment),
        work_type: form.work_type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        due_date: form.due_date || undefined,
      });
      setOrders((prev) => [created, ...prev]);
      setForm(EMPTY);
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't create.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatus(o: WorkOrder, status: string) {
    setBusyId(o.id);
    setError(null);
    try {
      const updated = await updateEquipmentWorkOrder(o.id, { status });
      setOrders((prev) =>
        prev.map((x) => (x.id === o.id ? { ...x, ...updated } : x))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(o: WorkOrder) {
    if (!window.confirm(`Delete work order for ${o.equipment_name}?`)) return;
    setBusyId(o.id);
    try {
      await deleteEquipmentWorkOrder(o.id);
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
    } finally {
      setBusyId(null);
    }
  }

  const input =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none";

  return (
    <AdminPageShell
      title="Work Orders"
      description="Repair and certification jobs for equipment. Update status as work progresses."
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search work orders…"
      actions={
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b]"
        >
          {showForm ? "Cancel" : "+ New Work Order"}
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
            <select
              className={input}
              value={form.work_type}
              onChange={(e) => setForm((f) => ({ ...f, work_type: e.target.value }))}
            >
              {WORK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {prettify(t)}
                </option>
              ))}
            </select>
            <select
              className={input}
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  Priority: {prettify(p)}
                </option>
              ))}
            </select>
            <input
              className={`${input} sm:col-span-2`}
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              type="date"
              className={input}
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            />
            <textarea
              className={`${input} sm:col-span-3`}
              placeholder="Description (optional)"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleCreate}
            className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Create work order"}
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select className={input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">Status: All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              Status: {prettify(s)}
            </option>
          ))}
        </select>
        <select className={input} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="All">Priority: All</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              Priority: {prettify(p)}
            </option>
          ))}
        </select>
        {(statusFilter !== "All" || priorityFilter !== "All" || search) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("All");
              setPriorityFilter("All");
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
      {isLoading && <p className="mt-6 text-sm text-slate-500">Loading work orders…</p>}
      {!isLoading && !error && filtered.length === 0 && (
        <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          No work orders found.
        </p>
      )}

      {filtered.length > 0 && (
        <div className="mt-6 space-y-2">
          {filtered.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">
                  {o.title || `${prettify(o.work_type)} – ${o.equipment_name}`}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {o.equipment_name} · {prettify(o.work_type)}
                  {o.due_date ? ` · Due ${o.due_date.slice(0, 10)}` : ""}
                  {o.notes || o.description ? ` · ${o.notes || o.description}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusDot
                  label={prettify(o.priority) || "Normal"}
                  tone={TONE[workOrderLevel(o)]}
                />
                <select
                  disabled={busyId === o.id}
                  value={o.status}
                  onChange={(e) => handleStatus(o, e.target.value)}
                  className={input}
                >
                  {Array.from(new Set([o.status, ...STATUSES])).map((s) => (
                    <option key={s} value={s}>
                      {prettify(s)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busyId === o.id}
                  onClick={() => handleDelete(o)}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
