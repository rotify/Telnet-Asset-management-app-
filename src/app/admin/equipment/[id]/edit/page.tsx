"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { getEquipment, getStaff, updateEquipment } from "@/lib/api";
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
  status: "",
  purchase_date: "",
  cost: "",
  supplier: "",
  warranty_expiry: "",
  service_interval_months: "",
  next_service_date: "",
  assigned_staff: "",
  regional_office: "",
  location: "",
  notes: "",
};

export default function EditEquipmentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const equipmentId = Number(params.id);
  const [gateChecked, setGateChecked] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
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

    Promise.all([getStaff(), getEquipment()])
      .then(([staffList, list]) => {
        setStaff(staffList);
        const record = list.find((e) => e.id === equipmentId);
        if (!record) {
          setError("Couldn't find that equipment record.");
          return;
        }
        const assignedName = record.assigned_staff ?? record.assigned_user ?? "";
        const matchedStaff = staffList.find(
          (s) => `${s.first_name} ${s.last_name}` === assignedName
        );
        setForm({
          name: record.name ?? "",
          equipment_type: record.equipment_type ?? "",
          serial_number: record.serial_number ?? "",
          manufacturer: "",
          model_number: "",
          status: record.status ?? "",
          purchase_date: record.purchase_date ?? "",
          cost: record.cost ?? "",
          supplier: "",
          warranty_expiry: record.warranty_expiry ?? "",
          service_interval_months: "",
          next_service_date: "",
          assigned_staff: matchedStaff ? String(matchedStaff.id) : "",
          regional_office: record.regional_office ?? "",
          location: record.location ?? "",
          notes: record.notes ?? "",
        });
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Couldn't load equipment."
        );
      })
      .finally(() => setIsLoading(false));
  }, [gateChecked, equipmentId]);

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
      await updateEquipment(equipmentId, {
        ...form,
        assigned_staff: form.assigned_staff
          ? Number(form.assigned_staff)
          : undefined,
      });
      router.push("/admin/equipment");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't update equipment."
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
          <AdminTopBar
            title="Company Equipment"
            description="Update this equipment record."
          />

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <p className="mt-6 text-sm text-slate-500">Loading…</p>
          ) : (
            <>
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
                    <select
                      value={form.equipment_type}
                      onChange={(e) =>
                        update("equipment_type", e.target.value)
                      }
                      className={inputClasses}
                    >
                      <option value="">Select a category</option>
                      <option value="computer">Computer</option>
                      <option value="laptop">Laptop</option>
                      <option value="printer">Printer</option>
                      <option value="scanner">Scanner</option>
                      <option value="copier">Copier</option>
                      <option value="ac">Air Conditioner</option>
                      <option value="generator">Generator</option>
                      <option value="furniture">Furniture</option>
                      <option value="phone">Phone/Communication</option>
                      <option value="appliance">Appliance</option>
                      <option value="safety">Safety Equipment</option>
                      <option value="network">Network Equipment</option>
                      <option value="electronics">Electronics</option>
                      <option value="office_supplies">Office Supplies</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Field label="Serial Number">
                    <input
                      type="text"
                      value={form.serial_number}
                      onChange={(e) =>
                        update("serial_number", e.target.value)
                      }
                      placeholder="E.g C02XK1PLQ"
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Manufacturer">
                    <input
                      type="text"
                      value={form.manufacturer}
                      onChange={(e) =>
                        update("manufacturer", e.target.value)
                      }
                      placeholder="E.g Apple"
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Model Number">
                    <input
                      type="text"
                      value={form.model_number}
                      onChange={(e) =>
                        update("model_number", e.target.value)
                      }
                      placeholder="E.g A2442"
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(e) => update("status", e.target.value)}
                      className={inputClasses}
                    >
                      <option value="">Select status</option>
                      <option value="active">Active</option>
                      <option value="pending_certification">
                        Pending Certification
                      </option>
                      <option value="inactive">Inactive</option>
                      <option value="damaged">Damaged</option>
                    </select>
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
                      onChange={(e) =>
                        update("purchase_date", e.target.value)
                      }
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
                      onChange={(e) =>
                        update("warranty_expiry", e.target.value)
                      }
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
                      onChange={(e) =>
                        update("assigned_staff", e.target.value)
                      }
                      className={inputClasses}
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Regional Office">
                    <select
                      value={form.regional_office}
                      onChange={(e) =>
                        update("regional_office", e.target.value)
                      }
                      className={inputClasses}
                    >
                      <option value="">Select regional office</option>
                      <option value="Lagos">Telnet Lagos</option>
                      <option value="Abuja">Telnet Abuja</option>
                      <option value="Port Harcourt">
                        Telnet Port Harcourt
                      </option>
                    </select>
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
                  {isSaving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/admin/equipment")}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
