"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getStoredUsername, isSuperAdmin } from "@/lib/auth";
import { createStaff, deleteStaff, getStaff, updateStaff } from "@/lib/api";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-topbar";
import { StatusDot } from "@/components/status-dot";
import type { Staff } from "@/types/staff";

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

export default function StaffPage() {
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
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

      <div className="flex-1 px-6 py-8 lg:ml-60">
        <div className="mx-auto max-w-6xl">
          {/* Sticky so the search/date/profile bar stays put while the
              page content below scrolls, matching the sidebar's fixed
              positioning instead of scrolling away with the page. */}
          <div className="sticky top-0 z-20 bg-[#EFF1F6] pb-2">
            <AdminTopBar />
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
            <button
              type="button"
              onClick={() => router.push("/admin/staff/new")}
              className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-telnet-primaryHover"
            >
              + Add Employee
            </button>
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
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
                placeholder="Search staff…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-telnet-primary focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "All" | "Active" | "Suspended")
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
            >
              <option value="All">Status: All</option>
              <option value="Active">Status: Active</option>
              <option value="Suspended">Status: Suspended</option>
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
            <p className="mt-6 text-sm text-slate-500">Loading staff…</p>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
              No staff match your search.
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="mt-6 space-y-3 md:hidden">
              {filtered.map((s) => {
                const isEditing = editingId === s.id;
                const isBusy = busyId === s.id;
                return (
                  <div
                    key={s.id}
                    className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400">{s.staff_id}</p>
                        {isEditing && editValues ? (
                          <div className="mt-1 flex gap-2">
                            <input
                              value={editValues.first_name}
                              onChange={(e) =>
                                setEditValues((v) =>
                                  v ? { ...v, first_name: e.target.value } : v
                                )
                              }
                              placeholder="First name"
                              className="w-full min-w-0 rounded border border-slate-200 px-2 py-1 text-sm focus:border-telnet-primary focus:outline-none"
                            />
                            <input
                              value={editValues.last_name}
                              onChange={(e) =>
                                setEditValues((v) =>
                                  v ? { ...v, last_name: e.target.value } : v
                                )
                              }
                              placeholder="Last name"
                              className="w-full min-w-0 rounded border border-slate-200 px-2 py-1 text-sm focus:border-telnet-primary focus:outline-none"
                            />
                          </div>
                        ) : (
                          <p className="font-semibold text-slate-800">
                            {s.first_name} {s.last_name}
                          </p>
                        )}
                      </div>
                      {isEditing && editValues ? (
                        <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
                          <input
                            type="checkbox"
                            checked={editValues.is_active}
                            onChange={(e) =>
                              setEditValues((v) =>
                                v ? { ...v, is_active: e.target.checked } : v
                              )
                            }
                          />
                          Active
                        </label>
                      ) : (
                        <StatusDot
                          label={s.is_active ? "Active" : "Suspended"}
                          tone={s.is_active ? "navy" : "red"}
                          className="shrink-0"
                        />
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <p className="text-slate-400">Department</p>
                        {isEditing && editValues ? (
                          <input
                            value={editValues.department}
                            onChange={(e) =>
                              setEditValues((v) =>
                                v ? { ...v, department: e.target.value } : v
                              )
                            }
                            className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-telnet-primary focus:outline-none"
                          />
                        ) : (
                          <p className="text-slate-700">
                            {s.department || "—"}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-slate-400">Branch</p>
                        {isEditing && editValues ? (
                          <input
                            value={editValues.branch}
                            onChange={(e) =>
                              setEditValues((v) =>
                                v ? { ...v, branch: e.target.value } : v
                              )
                            }
                            className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-telnet-primary focus:outline-none"
                          />
                        ) : (
                          <p className="text-slate-700">{s.branch || "—"}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex gap-4 border-t border-slate-100 pt-3">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => saveEdit(s.id)}
                            className="text-sm font-medium text-telnet-primary hover:text-telnet-primaryHover disabled:opacity-60"
                          >
                            {isBusy ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-sm font-medium text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(s)}
                            className="text-sm font-medium text-telnet-primary hover:text-telnet-primaryHover"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDelete(s)}
                            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                          >
                            {isBusy ? "…" : "Delete"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="mt-6 hidden overflow-x-auto rounded-xl bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06)] md:block">
              <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-blue-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Last Active</th>
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
                        No staff match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => {
                      const isEditing = editingId === s.id;
                      const isBusy = busyId === s.id;
                      return (
                        <tr
                          key={s.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {isEditing && editValues ? (
                              <div className="flex gap-2">
                                <input
                                  value={editValues.first_name}
                                  onChange={(e) =>
                                    setEditValues((v) =>
                                      v ? { ...v, first_name: e.target.value } : v
                                    )
                                  }
                                  className="w-24 rounded border border-slate-200 px-2 py-1 text-sm focus:border-telnet-primary focus:outline-none"
                                />
                                <input
                                  value={editValues.last_name}
                                  onChange={(e) =>
                                    setEditValues((v) =>
                                      v ? { ...v, last_name: e.target.value } : v
                                    )
                                  }
                                  className="w-24 rounded border border-slate-200 px-2 py-1 text-sm focus:border-telnet-primary focus:outline-none"
                                />
                              </div>
                            ) : (
                              `${s.first_name} ${s.last_name}`
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {s.email || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {s.driver_status || "Staff"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {isEditing && editValues ? (
                              <input
                                value={editValues.department}
                                onChange={(e) =>
                                  setEditValues((v) =>
                                    v ? { ...v, department: e.target.value } : v
                                  )
                                }
                                className="w-28 rounded border border-slate-200 px-2 py-1 text-sm focus:border-telnet-primary focus:outline-none"
                              />
                            ) : (
                              s.department || "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatDate(s.updated_at)}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing && editValues ? (
                              <input
                                type="checkbox"
                                checked={editValues.is_active}
                                onChange={(e) =>
                                  setEditValues((v) =>
                                    v ? { ...v, is_active: e.target.checked } : v
                                  )
                                }
                              />
                            ) : (
                              <StatusDot
                                label={s.is_active ? "Active" : "Suspended"}
                                tone={s.is_active ? "navy" : "red"}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => saveEdit(s.id)}
                                  className="text-sm font-medium text-telnet-primary hover:text-telnet-primaryHover disabled:opacity-60"
                                >
                                  {isBusy ? "Saving…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="text-sm font-medium text-slate-400 hover:text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => startEdit(s)}
                                  className="text-sm font-medium text-telnet-primary hover:text-telnet-primaryHover"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleDelete(s)}
                                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                                >
                                  {isBusy ? "…" : "Delete"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ROLE_CARDS.map((role) => (
              <div
                key={role.name}
                className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[#121B3B]">{role.name}</p>
                  <span className="text-xs text-slate-400">
                    {role.members} member(s)
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {role.description}
                </p>
                <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {Array.from({ length: role.visiblePermissions }).map(
                    (_, i) => (
                      <li
                        key={i}
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
                        View assets
                      </li>
                    )
                  )}
                </ul>
                {role.morePermissions > 0 && (
                  <p className="mt-2 text-xs text-slate-400">
                    +{role.morePermissions} more permissions
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
