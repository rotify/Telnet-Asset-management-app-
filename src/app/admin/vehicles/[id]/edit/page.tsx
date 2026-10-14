"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { getStaff, getVehicles, updateVehicle } from "@/lib/api";
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

// Only fields the backend's Vehicle serializer actually accepts, confirmed
// against the live DRF API (http://207.180.246.69:7038/api/vehicles/).
const EMPTY = {
  license_plate: "",
  asset_type: "",
  make: "",
  model: "",
  vin_number: "",
  status: "",
  assigned_staff: "",
  insurance_expiry: "",
  roadworthy_expiry: "",
  license_expiry: "",
  hackney_permit: "",
  cost: "",
};

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const vehicleId = Number(params.id);
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

    Promise.all([getStaff(), getVehicles()])
      .then(([staffList, list]) => {
        setStaff(staffList);
        const record = list.find((v) => v.id === vehicleId);
        if (!record) {
          setError("Couldn't find that vehicle record.");
          return;
        }
        const matchedStaff = staffList.find(
          (s) => `${s.first_name} ${s.last_name}` === (record.assigned_staff ?? "")
        );
        setForm({
          license_plate: record.license_plate ?? "",
          asset_type: record.asset_type ?? "",
          make: record.make ?? "",
          model: record.model ?? "",
          vin_number: record.vin_number ?? "",
          status: record.status ?? "",
          assigned_staff: matchedStaff ? String(matchedStaff.id) : "",
          insurance_expiry: record.insurance_expiry ?? "",
          roadworthy_expiry: record.roadworthy_expiry ?? "",
          license_expiry: record.license_expiry ?? "",
          hackney_permit: record.hackney_permit ?? "",
          cost: record.cost ?? "",
        });
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Couldn't load vehicle."
        );
      })
      .finally(() => setIsLoading(false));
  }, [gateChecked, vehicleId]);

  function update<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.license_plate.trim() && !form.model.trim()) {
      setError("Registration number or model is required.");
      return;
    }
    setIsSaving(true);
    try {
      const name =
        [form.make, form.model].filter(Boolean).join(" ") ||
        form.license_plate;
      await updateVehicle(vehicleId, {
        ...form,
        name,
        assigned_staff: form.assigned_staff
          ? Number(form.assigned_staff)
          : undefined,
      });
      router.push("/admin/vehicles");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't update vehicle."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="min-w-0 flex-1 px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <AdminTopBar />
          </div>

          <header className="mt-6">
            <h1 className="text-2xl font-bold uppercase text-[#121B3B]">
              Company Asset
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Update this vehicle&apos;s details and compliance documents.
            </p>
          </header>

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
                  Vehicle Identity
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Registration Number">
                    <input
                      type="text"
                      value={form.license_plate}
                      onChange={(e) =>
                        update("license_plate", e.target.value)
                      }
                      placeholder="Enter the registration number"
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Vehicle Type">
                    <select
                      value={form.asset_type}
                      onChange={(e) => update("asset_type", e.target.value)}
                      className={inputClasses}
                    >
                      <option value="">Select a vehicle type</option>
                      <option value="car">Car</option>
                      <option value="truck">Truck</option>
                      <option value="van">Van</option>
                      <option value="bus">Bus</option>
                      <option value="motorbike">Motorbike</option>
                    </select>
                  </Field>
                  <Field label="Manufacturer">
                    <input
                      type="text"
                      value={form.make}
                      onChange={(e) => update("make", e.target.value)}
                      placeholder="E.g Toyota"
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Model">
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) => update("model", e.target.value)}
                      placeholder="E.g Hilux 2.4D"
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Serial / VIN Number">
                    <input
                      type="text"
                      value={form.vin_number}
                      onChange={(e) => update("vin_number", e.target.value)}
                      placeholder="Enter VIN number"
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Condition">
                    <select
                      value={form.status}
                      onChange={(e) => update("status", e.target.value)}
                      className={inputClasses}
                    >
                      <option value="">Select vehicle condition</option>
                      <option value="active">Active</option>
                      <option value="pending_certification">
                        Pending Certification
                      </option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
                <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
                  Assignment
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Assigned Driver">
                    <select
                      value={form.assigned_staff}
                      onChange={(e) =>
                        update("assigned_staff", e.target.value)
                      }
                      className={inputClasses}
                    >
                      <option value="">Unassigned</option>
                      {staff
                        .filter(
                          (s) =>
                            Boolean(s.driver_status?.trim()) ||
                            String(s.id) === form.assigned_staff
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.first_name} {s.last_name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Purchase Cost">
                    <input
                      type="text"
                      value={form.cost}
                      onChange={(e) => update("cost", e.target.value)}
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
                  <Field label="Insurance Expiry">
                    <input
                      type="date"
                      value={form.insurance_expiry}
                      onChange={(e) =>
                        update("insurance_expiry", e.target.value)
                      }
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Road Worthiness Expiry">
                    <input
                      type="date"
                      value={form.roadworthy_expiry}
                      onChange={(e) =>
                        update("roadworthy_expiry", e.target.value)
                      }
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Licence Expiry">
                    <input
                      type="date"
                      value={form.license_expiry}
                      onChange={(e) =>
                        update("license_expiry", e.target.value)
                      }
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Hackney Permit Expiry">
                    <input
                      type="date"
                      value={form.hackney_permit}
                      onChange={(e) =>
                        update("hackney_permit", e.target.value)
                      }
                      className={inputClasses}
                    />
                  </Field>
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
                  onClick={() => router.push("/admin/vehicles")}
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
