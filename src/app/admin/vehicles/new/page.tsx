"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { createVehicle, getStaff } from "@/lib/api";
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
  license_plate: "",
  asset_type: "",
  make: "",
  model: "",
  year_of_manufacture: "",
  vin_number: "",
  engine_number: "",
  fuel_type: "",
  color: "",
  status: "",
  assigned_staff: "",
  department: "",
  current_mileage: "",
  service_interval_km: "",
  base_location: "",
  next_service_date: "",
  insurance_provider: "",
  insurance_policy_number: "",
  roadworthy_expiry: "",
  license_expiry: "",
  cost: "",
  notes: "",
};

export default function AddVehiclePage() {
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
    if (!form.license_plate.trim() && !form.model.trim()) {
      setError("Registration number or model is required.");
      return;
    }
    setIsSaving(true);
    try {
      const name =
        [form.make, form.model].filter(Boolean).join(" ") ||
        form.license_plate;
      await createVehicle({
        ...form,
        name,
        assigned_staff: form.assigned_staff
          ? Number(form.assigned_staff)
          : undefined,
      });
      router.push("/admin/vehicles");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't register vehicle."
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
            <h1 className="text-2xl font-bold uppercase text-[#121B3B]">
              Company Asset
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Register a new vehicle and keep its compliance documents up to
              date.
            </p>
          </header>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Vehicle Identity
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Registration Number">
                <input
                  type="text"
                  value={form.license_plate}
                  onChange={(e) => update("license_plate", e.target.value)}
                  placeholder="Enter the registration number"
                  className={inputClasses}
                />
              </Field>
              <Field label="Vehicle Type">
                <input
                  type="text"
                  value={form.asset_type}
                  onChange={(e) => update("asset_type", e.target.value)}
                  placeholder="Select a vehicle type"
                  className={inputClasses}
                />
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
              <Field label="Year Of Manufacture">
                <input
                  type="date"
                  value={form.year_of_manufacture}
                  onChange={(e) =>
                    update("year_of_manufacture", e.target.value)
                  }
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
              <Field label="Engine Number">
                <input
                  type="text"
                  value={form.engine_number}
                  onChange={(e) => update("engine_number", e.target.value)}
                  placeholder="Enter engine number"
                  className={inputClasses}
                />
              </Field>
              <Field label="Fuel Type">
                <input
                  type="text"
                  value={form.fuel_type}
                  onChange={(e) => update("fuel_type", e.target.value)}
                  placeholder="Select a vehicle type"
                  className={inputClasses}
                />
              </Field>
              <Field label="Color">
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => update("color", e.target.value)}
                  placeholder="Enter color"
                  className={inputClasses}
                />
              </Field>
              <Field label="Condition">
                <input
                  type="text"
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                  placeholder="Select vehicle condition"
                  className={inputClasses}
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Assignment &amp; Usage
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Assigned Driver">
                <select
                  value={form.assigned_staff}
                  onChange={(e) => update("assigned_staff", e.target.value)}
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
              <Field label="Department">
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  placeholder="Select a Department"
                  className={inputClasses}
                />
              </Field>
              <Field label="Current Millage (Km)">
                <input
                  type="text"
                  value={form.current_mileage}
                  onChange={(e) => update("current_mileage", e.target.value)}
                  placeholder="1000"
                  className={inputClasses}
                />
              </Field>
              <Field label="Service Interval ( Km )">
                <input
                  type="text"
                  value={form.service_interval_km}
                  onChange={(e) =>
                    update("service_interval_km", e.target.value)
                  }
                  placeholder="1000"
                  className={inputClasses}
                />
              </Field>
              <Field label="Base Location">
                <input
                  type="text"
                  value={form.base_location}
                  onChange={(e) => update("base_location", e.target.value)}
                  placeholder="Enter location"
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
              <Field label="Insurance Provider">
                <input
                  type="text"
                  value={form.insurance_provider}
                  onChange={(e) =>
                    update("insurance_provider", e.target.value)
                  }
                  placeholder="E.g Iteco insurance"
                  className={inputClasses}
                />
              </Field>
              <Field label="Insurance Policy Number">
                <input
                  type="text"
                  value={form.insurance_policy_number}
                  onChange={(e) =>
                    update("insurance_policy_number", e.target.value)
                  }
                  placeholder="Enter policy number"
                  className={inputClasses}
                />
              </Field>
              <Field label="Current Millage (Km)">
                <input
                  type="text"
                  value={form.current_mileage}
                  onChange={(e) => update("current_mileage", e.target.value)}
                  placeholder="1000"
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
                  type="text"
                  value={form.license_expiry}
                  onChange={(e) => update("license_expiry", e.target.value)}
                  placeholder="Enter location"
                  className={inputClasses}
                />
              </Field>
              <Field label="Purchase Cost">
                <input
                  type="date"
                  value={form.cost}
                  onChange={(e) => update("cost", e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Emergency Contact Name">
                  <textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="certification, restrictions, onboarding note …."
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
              {isSaving ? "Saving…" : "+ Register Vehicle"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/vehicles")}
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
