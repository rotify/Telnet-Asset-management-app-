"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { createEquipment, getStaff } from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import type { Staff } from "@/types/staff";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#121B3B]">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-telnet-primary focus:outline-none";

const EMPTY = {
  name: "",
  equipment_type: "",
  serial_number: "",
  manufacturer: "",
  model_number: "",
  condition: "",
  purchase_date: "",
  cost: "",
  supplier: "",
  warranty_expiry: "",
  service_interval_months: "",
  next_service_date: "",
  assigned_staff: "",
  department: "",
  location: "",
  notes: "",
};

export default function AddEquipmentPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!gateChecked) return;
    getStaff()
      .then(setStaff)
      .catch(() => setStaff([]));
  }, [gateChecked]);

  function update<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Equipment name is required.");
      return;
    }
    setIsSaving(true);
    try {
      await createEquipment(form);
      router.push("/admin/equipment");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't register equipment."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <AdminTopBar />

          <header className="mt-6">
            <h1 className="text-2xl font-bold text-[#121B3B]">
              Company Equipment
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Add a new piece of equipment and record everything needed for
              warranty claims and servicing.
            </p>
          </header>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Equipment Details
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Equipment Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="E.g MacBook pro 14"
                  className={inputClasses}
                />
              </Field>
              <Field label="Category">
                <input
                  type="text"
                  value={form.equipment_type}
                  onChange={(e) => update("equipment_type", e.target.value)}
                  placeholder="Select a category"
                  className={inputClasses}
                />
              </Field>
              <Field label="Serial Number">
                <input
                  type="text"
                  value={form.serial_number}
                  onChange={(e) => update("serial_number", e.target.value)}
                  placeholder="E.g C02XK1PLQ"
                  className={inputClasses}
                />
              </Field>
              <Field label="Manufacturer">
                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) => update("manufacturer", e.target.value)}
                  placeholder="E.g Apple"
                  className={inputClasses}
                />
              </Field>
              <Field label="Model Number">
                <input
                  type="text"
                  value={form.model_number}
                  onChange={(e) => update("model_number", e.target.value)}
                  placeholder="E.g A2442"
                  className={inputClasses}
                />
              </Field>
              <Field label="Condition">
                <input
                  type="text"
                  value={form.condition}
                  onChange={(e) => update("condition", e.target.value)}
                  placeholder="Select condition"
                  className={inputClasses}
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Equipment Details
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Purchase Date">
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => update("purchase_date", e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field label="Purchase Cost">
                <input
                  type="text"
                  value={form.cost}
                  onChange={(e) => update("cost", e.target.value)}
                  placeholder="0.00"
                  className={inputClasses}
                />
              </Field>
              <Field label="Supplier">
                <input
                  type="text"
                  value={form.supplier}
                  onChange={(e) => update("supplier", e.target.value)}
                  placeholder="E.g softworks"
                  className={inputClasses}
                />
              </Field>
              <Field label="Warranty Expiry">
                <input
                  type="date"
                  value={form.warranty_expiry}
                  onChange={(e) => update("warranty_expiry", e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field label="Service Interval ( Month)">
                <input
                  type="text"
                  value={form.service_interval_months}
                  onChange={(e) =>
                    update("service_interval_months", e.target.value)
                  }
                  placeholder="E.g 12"
                  className={inputClasses}
                />
              </Field>
              <Field label="Next Service Date">
                <input
                  type="date"
                  value={form.next_service_date}
                  onChange={(e) =>
                    update("next_service_date", e.target.value)
                  }
                  className={inputClasses}
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Compliance Documents
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Assigned Staff">
                <select
                  value={form.assigned_staff}
                  onChange={(e) => update("assigned_staff", e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={`${s.first_name} ${s.last_name}`}>
                      {s.first_name} {s.last_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Department">
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  placeholder="Select department"
                  className={inputClasses}
                />
              </Field>
              <Field label="Location">
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="E.g Lagos HQ - Floor #"
                  className={inputClasses}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Accessories included, license keys, handling notes…"
                    rows={3}
                    className={inputClasses}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "+ Register Equipment"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/equipment")}
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
