"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { createStaff } from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";

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
  full_name: "",
  staff_id: "",
  email: "",
  phone_number: "",
  date_of_birth: "",
  home_address: "",
  department: "",
  job_title: "",
  system_role: "",
  employment_type: "",
  date_joined: "",
  status: "",
  reporting_manager: "",
  work_location: "",
  drivers_licence_number: "",
  licence_expiry: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  notes: "",
};

export default function AddStaffPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
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

  function update<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }
    setIsSaving(true);
    try {
      const [first_name, ...rest] = form.full_name.trim().split(/\s+/);
      const last_name = rest.join(" ") || first_name;
      await createStaff({
        first_name,
        last_name,
        staff_id: form.staff_id || undefined,
        email: form.email || undefined,
        department: form.department || undefined,
        branch: form.work_location || undefined,
        is_active: true,
        phone_number: form.phone_number || undefined,
        date_of_birth: form.date_of_birth || undefined,
        home_address: form.home_address || undefined,
        job_title: form.job_title || undefined,
        system_role: form.system_role || undefined,
        employment_type: form.employment_type || undefined,
        date_joined: form.date_joined || undefined,
        status: form.status || undefined,
        reporting_manager: form.reporting_manager || undefined,
        work_location: form.work_location || undefined,
        drivers_licence_number: form.drivers_licence_number || undefined,
        licence_expiry: form.licence_expiry || undefined,
        emergency_contact_name: form.emergency_contact_name || undefined,
        emergency_contact_phone: form.emergency_contact_phone || undefined,
        notes: form.notes || undefined,
      });
      router.push("/admin/staff");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add employee.");
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
              Create a staff record so assets, documents and maintenance can
              be attributed to a real person.
            </p>
          </header>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Personal Details
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name">
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  placeholder="Enter full name"
                  className={inputClasses}
                />
              </Field>
              <Field label="Employee ID">
                <input
                  type="text"
                  value={form.staff_id}
                  onChange={(e) => update("staff_id", e.target.value)}
                  placeholder="Enter employee ID"
                  className={inputClasses}
                />
              </Field>
              <Field label="Email Address">
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="Enter employees email"
                  className={inputClasses}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  type="text"
                  value={form.phone_number}
                  onChange={(e) => update("phone_number", e.target.value)}
                  placeholder="Enter employees phone number"
                  className={inputClasses}
                />
              </Field>
              <Field label="Date Of Birth">
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => update("date_of_birth", e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field label="Home Address">
                <input
                  type="text"
                  value={form.home_address}
                  onChange={(e) => update("home_address", e.target.value)}
                  placeholder="Street, city, state"
                  className={inputClasses}
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Employment
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Department">
                <select
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Enter full name</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="HR">HR</option>
                  <option value="IT">IT</option>
                  <option value="Logistics">Logistics</option>
                </select>
              </Field>
              <Field label="Job Title">
                <input
                  type="text"
                  value={form.job_title}
                  onChange={(e) => update("job_title", e.target.value)}
                  placeholder="Enter employee ID"
                  className={inputClasses}
                />
              </Field>
              <Field label="System Role">
                <select
                  value={form.system_role}
                  onChange={(e) => update("system_role", e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Enter employees email</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Driver">Driver</option>
                  <option value="Staff">Staff</option>
                </select>
              </Field>
              <Field label="Employment Type">
                <select
                  value={form.employment_type}
                  onChange={(e) => update("employment_type", e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Enter employees phone number</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </Field>
              <Field label="Date Joined">
                <input
                  type="date"
                  value={form.date_joined}
                  onChange={(e) => update("date_joined", e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Street, city, state</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Invited">Invited</option>
                </select>
              </Field>
              <Field label="Reporting Manager">
                <input
                  type="text"
                  value={form.reporting_manager}
                  onChange={(e) =>
                    update("reporting_manager", e.target.value)
                  }
                  placeholder="Enter full name"
                  className={inputClasses}
                />
              </Field>
              <Field label="Work Location">
                <input
                  type="text"
                  value={form.work_location}
                  onChange={(e) => update("work_location", e.target.value)}
                  placeholder="Street, city, state"
                  className={inputClasses}
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-semibold text-[#121B3B]">
              Drivers And Emergency Details
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Required for staff who will be assigned company vehicles
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Driver's Licence Number">
                <input
                  type="text"
                  value={form.drivers_licence_number}
                  onChange={(e) =>
                    update("drivers_licence_number", e.target.value)
                  }
                  placeholder="Enter full name"
                  className={inputClasses}
                />
              </Field>
              <Field label="Licence Expiry">
                <input
                  type="date"
                  value={form.licence_expiry}
                  onChange={(e) => update("licence_expiry", e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field label="Emergency Contact Name">
                <input
                  type="text"
                  value={form.emergency_contact_name}
                  onChange={(e) =>
                    update("emergency_contact_name", e.target.value)
                  }
                  placeholder="Enter contact name"
                  className={inputClasses}
                />
              </Field>
              <Field label="Emergency Contact Phone">
                <input
                  type="text"
                  value={form.emergency_contact_phone}
                  onChange={(e) =>
                    update("emergency_contact_phone", e.target.value)
                  }
                  placeholder="Enter contact phone"
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
              {isSaving ? "Saving…" : "+ Add Employee"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/staff")}
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
