"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import {
  createStaff,
  deleteStaff,
  getAdminUsers,
  getRolePermissions,
  getStaff,
  updateStaff,
} from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import { AdminUsersSection } from "@/components/admin-users-section";
import { StatusDot } from "@/components/status-dot";
import type { Staff } from "@/types/staff";
import type { AdminUser } from "@/types/admin";
import { defaultPermissions } from "@/lib/permission-defaults";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type RolePermissions,
} from "@/types/permissions";

interface EditableFields {
  first_name: string;
  last_name: string;
  department: string;
  branch: string;
  is_active: boolean;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB");
}

function toEditable(s: Staff): EditableFields {
  return {
    first_name: s.first_name ?? "",
    last_name: s.last_name ?? "",
    department: s.department ?? "",
    branch: s.branch ?? "",
    is_active: s.is_active,
  };
}

const EMPTY_NEW_STAFF = {
  staff_id: "",
  first_name: "",
  last_name: "",
};

const ROLE_CARDS = [
  {
    name: "Super Admin",
    members: 1,
    description: "Full control over assets, staff, roles and system settings.",
    visiblePermissions: 1,
    morePermissions: 6,
  },
  {
    name: "Admin",
    members: 1,
    description:
      "Manage assets, assignments, maintenance and reporting for their department.",
    visiblePermissions: 1,
    morePermissions: 2,
  },
  {
    name: "Driver",
    members: 10,
    description: "Views assigned vehicles, logs trips and reports faults.",
    visiblePermissions: 1,
    morePermissions: 0,
  },
  {
    name: "Staff",
    members: 30,
    description: "Views their own assigned equipment and company documents.",
    visiblePermissions: 1,
    morePermissions: 0,
  },
] as const;

// Which system users belong under each role card.
const ROLE_MATCH: Record<string, (u: AdminUser) => boolean> = {
  "Super Admin": (u) => u.is_superuser,
  Admin: (u) => u.role === "admin" && !u.is_superuser,
  Driver: (u) => u.role === "driver",
  Staff: (u) => u.role === "staff",
};

// Which permission set (editor role) backs each card.
const CARD_ROLE: Record<string, string> = {
  "Super Admin": "admin",
  Admin: "manager",
  Driver: "staff",
  Staff: "staff",
};

function permissionLines(p: RolePermissions | undefined): string[] {
  if (!p) return [];
  return PERMISSION_MODULES.flatMap((m) => {
    const row = p.modules[m.key];
    const granted = PERMISSION_ACTIONS.filter((a) => row?.[a]);
    if (granted.length === 0) return [];
    const actions =
      granted.length === PERMISSION_ACTIONS.length
        ? "Full access"
        : granted.map((a) => a[0].toUpperCase() + a.slice(1)).join(", ");
    return [`${m.label}: ${actions}`];
  });
}

export default function StaffPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, RolePermissions>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Suspended">("All");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaff, setNewStaff] = useState(EMPTY_NEW_STAFF);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditableFields | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

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
    getAdminUsers(200)
      .then((page) => setUsers(page.results))
      .catch(() => setUsers([]));

    (["admin", "manager", "staff"] as const).forEach((r) => {
      getRolePermissions(r)
        .catch(() => defaultPermissions(r))
        .then((p) => setRolePerms((prev) => ({ ...prev, [r]: p })));
    });
  }, [gateChecked]);

  async function loadStaff() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStaff();
      setStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load staff.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!gateChecked) return;
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateChecked]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" ? s.is_active : !s.is_active);
      const matchesSearch =
        !q ||
        `${s.first_name} ${s.last_name} ${s.staff_id} ${s.email ?? ""} ${s.department ?? ""} ${s.branch ?? ""}`
          .toLowerCase()
          .includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [staff, search, statusFilter]);

  async function handleAddStaff() {
    setAddError(null);
    if (!newStaff.staff_id.trim() || !newStaff.first_name.trim() || !newStaff.last_name.trim()) {
      setAddError("Staff ID, first name, and last name are required.");
      return;
    }
    setIsAdding(true);
    try {
      const created = await createStaff(newStaff);
      setStaff((prev) => [created, ...prev]);
      setNewStaff(EMPTY_NEW_STAFF);
      setShowAddForm(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Couldn't add staff.");
    } finally {
      setIsAdding(false);
    }
  }

  function startEdit(s: Staff) {
    setEditingId(s.id);
    setEditValues(toEditable(s));
    setRowError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues(null);
    setRowError(null);
  }

  async function saveEdit(id: number) {
    if (!editValues) return;
    setRowError(null);
    setBusyId(id);
    try {
      const updated = await updateStaff(id, editValues);
      setStaff((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
      setEditValues(null);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(s: Staff) {
    if (!window.confirm(`Remove ${s.first_name} ${s.last_name} from staff?`)) {
      return;
    }
    setBusyId(s.id);
    setRowError(null);
    try {
      await deleteStaff(s.id);
      setStaff((prev) => prev.filter((item) => item.id !== s.id));
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Couldn't delete staff.");
    } finally {
      setBusyId(null);
    }
  }

  if (!gateChecked) return null;

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-[#EFF1F6]">
      <AdminSidebar />

      <div className="min-w-0 flex-1 px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          {/* Sticky so the search/date/profile bar stays put while the
              page content below scrolls, matching the sidebar's fixed
              positioning instead of scrolling away with the page. */}
          <div className="sticky top-12 z-20 bg-[#EFF1F6] pb-2 lg:top-0">
            <AdminTopBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search staff and users…"
            />
          </div>

          <header className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#121B3B]">
                Users &amp; Roles
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Monitor company assets, vehicles, equipment, maintenance
                schedules, and document status from one centralized dashboard.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/staff/roles")}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#121B3B] hover:bg-slate-50"
            >
              Role Permissions
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/staff/new")}
              className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover"
            >
              + Add Employee
            </button>
            </div>
          </header>

          {showAddForm && (
            <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              <p className="text-sm font-semibold text-[#121B3B]">
                New staff member
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="Staff ID"
                  value={newStaff.staff_id}
                  onChange={(e) =>
                    setNewStaff((v) => ({ ...v, staff_id: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="First name"
                  value={newStaff.first_name}
                  onChange={(e) =>
                    setNewStaff((v) => ({ ...v, first_name: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={newStaff.last_name}
                  onChange={(e) =>
                    setNewStaff((v) => ({ ...v, last_name: e.target.value }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-telnet-primary focus:outline-none"
                />
              </div>
              {addError && (
                <p className="mt-2 text-sm text-red-600">{addError}</p>
              )}
              <button
                type="button"
                onClick={handleAddStaff}
                disabled={isAdding}
                className="mt-3 rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover disabled:opacity-60"
              >
                {isAdding ? "Adding…" : "Save staff member"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadStaff}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {rowError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {rowError}
            </div>
          )}

          <AdminUsersSection search={search} />

          <div className="mt-8 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            {ROLE_CARDS.map((role) => {
              const members = users.filter(ROLE_MATCH[role.name] ?? (() => false));
              return (
              <div
                key={role.name}
                className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[#121B3B]">{role.name}</p>
                  <span className="text-xs text-slate-400">
                    {members.length} member(s)
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {role.description}
                </p>
                <details className="group mt-3 border-t border-slate-100 pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[#121B3B]">
                    Permissions
                    <span className="text-slate-400 transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  {(() => {
                    const lines = permissionLines(rolePerms[CARD_ROLE[role.name]]);
                    return lines.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-400">
                        No permissions granted.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {lines.map((line) => (
                          <li
                            key={line}
                            className="flex items-center gap-2 text-xs text-slate-600"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#2DB130"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            {line}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </details>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
