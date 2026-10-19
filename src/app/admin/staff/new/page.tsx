"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { createAdminStaff, getStaff, updateAdminUser } from "@/lib/api";
import type { Staff } from "@/types/staff";
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

// Backend role values for the System Role choices.
const ROLE_VALUES: Record<string, string> = {
  "Super Admin": "admin",
  Admin: "admin",
  Manager: "manager",
  Driver: "driver",
  Staff: "staff",
};

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
  supervisor: "",
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
  const [people, setPeople] = useState<Staff[]>([]);

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
    getStaff()
      .then(setPeople)
      .catch(() => setPeople([]));
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
    if (!form.staff_id.trim() || !form.email.trim()) {
      setError("Employee ID and email are required to create a login.");
      return;
    }
    setIsSaving(true);
    try {
      const [first_name, ...rest] = form.full_name.trim().split(/\s+/);
      const last_name = rest.join(" ") || first_name;
      const created = await createAdminStaff({
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
        role: ROLE_VALUES[form.system_role] || undefined,
        employment_type: form.employment_type || undefined,
        date_joined: form.date_joined || undefined,
        status: form.status || undefined,
        reporting_manager: form.reporting_manager ? Number(form.reporting_manager) : undefined,
        supervisor: form.supervisor ? Number(form.supervisor) : undefined,
        work_location: form.work_location || undefined,
        drivers_licence_number: form.drivers_licence_number || undefined,
        licence_expiry: form.licence_expiry || undefined,
        emergency_contact_name: form.emergency_contact_name || undefined,
        emergency_contact_phone: form.emergency_contact_phone || undefined,
        notes: form.notes || undefined,
      });
      // The backend creates the login and emails a temporary password.
      // Roles are set separately on the linked user.
      const role = ROLE_VALUES[form.system_role];
      if (role && typeof created?.user === "number") {
        try {
          await updateAdminUser(created.user, { role });
        } catch {
          setError(
            "Employee added and login emailed, but the role couldn't be set. Set it from Users & Roles."
          );
          setIsSaving(false);
          return;
        }
      }
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

      <div className="min-w-0 flex-1 px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <AdminTopBar />
          </div>

          <header className="mt-6">
            <h1 className="text-2xl font-bold text-[#121B3B]">Add Employee</h1>
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
              <p className="text-xs text-slate-500 sm:col-span-2">
                A login is created automatically and the temporary password is
                emailed to this address.
              </p>
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
                  <option value="">Select a department</option>
                  <option value="ABS">ABS</option>
                  <option value="ITECO">ITECO</option>
                  <option value="SOFTWORKS">SOFTWORKS</option>
                  <option value="HR">HR</option>
                  <option value="MANAGEMENT">MANAGEMENT</option>
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
                  
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
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
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Invited">Invited</option>
                </select>
              </Field>
              <Field label="Reporting Manager">
                <select
                  value={form.reporting_manager}
                  onChange={(e) => update("reporting_manager", e.target.value)}
                  className={inputClasses}
                >
                  <option value="">
                    {people.length ? "Select from staff" : "No staff available yet"}
                  </option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.staff_id})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Supervisor">
                <select
                  value={form.supervisor}
                  onChange={(e) => update("supervisor", e.target.value)}
                  className={inputClasses}
                >
                  <option value="">
                    {people.length ? "Select from staff" : "No staff available yet"}
                  </option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.staff_id})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Branch">
                <select
                  value={form.work_location}
                  onChange={(e) => update("work_location", e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Select a branch</option>
                  <option value="LAGOS">Lagos</option>
                  <option value="ABUJA">Abuja</option>
                  <option value="PORT_HARCOURT">Port Harcourt</option>
                </select>
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
