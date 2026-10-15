"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteAdminUser,
  getAdminRoles,
  getAdminUsers,
  updateAdminUser,
} from "@/lib/api";
import { ThreeDotMenu, MenuItem } from "@/components/three-dot-menu";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import type { AdminRole, AdminUser } from "@/types/admin";

const ROLE_TONES: Record<string, StatusTone> = {
  admin: "red",
  manager: "orange",
  driver: "slate",
  staff: "navy",
};

function fullName(u: AdminUser): string {
  const name = `${u.first_name} ${u.last_name}`.trim();
  return name || u.username;
}

// System users (login accounts) from the admin API, with a role filter.
// Search text comes from the page's top-bar search box.
export function AdminUsersSection({ search }: { search: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Suspended"
  >("All");

  useEffect(() => {
    Promise.all([getAdminUsers(), getAdminRoles().catch(() => [] as AdminRole[])])
      .then(([u, r]) => {
        setUsers(u.results);
        setRoles(r);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load users.")
      )
      .finally(() => setIsLoading(false));
  }, []);

  const roleLabel = useMemo(
    () => new Map(roles.map((r) => [r.value, r.label])),
    [roles]
  );
  const labelFor = (value: string) =>
    roleLabel.get(value) ?? value.replace(/\b\w/g, (c) => c.toUpperCase());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = roleFilter === "All" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" ? u.is_active : !u.is_active);
      const matchesSearch =
        !q ||
        `${u.username} ${fullName(u)} ${u.email ?? ""} ${u.department ?? ""} ${labelFor(u.role)}`
          .toLowerCase()
          .includes(q);
      return matchesRole && matchesStatus && matchesSearch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, search, roleFilter, statusFilter, roleLabel]);

  const [actionError, setActionError] = useState<string | null>(null);

  async function applyUpdate(u: AdminUser, patch: Partial<AdminUser>) {
    setActionError(null);
    try {
      const updated = await updateAdminUser(u.id, patch);
      setUsers((list) =>
        list.map((x) => (x.id === u.id ? { ...x, ...patch, ...updated } : x))
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function removeUser(u: AdminUser) {
    if (!window.confirm(`Delete ${fullName(u)}? This can't be undone.`)) return;
    setActionError(null);
    try {
      await deleteAdminUser(u.id);
      setUsers((list) => list.filter((x) => x.id !== u.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  function renderActions(u: AdminUser) {
    if (u.is_superuser) {
      return <span className="text-xs text-slate-400">—</span>;
    }
    return (
      <ThreeDotMenu>
        {(close) => (
          <div>
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase text-slate-400">
              Change role
            </p>
            {roles
              .filter((r) => r.value !== u.role)
              .map((r) => (
                <MenuItem
                  key={r.value}
                  onClick={() => {
                    close();
                    applyUpdate(u, { role: r.value });
                  }}
                >
                  Make {r.label}
                </MenuItem>
              ))}
            <MenuItem
              onClick={() => {
                close();
                applyUpdate(u, { is_active: !u.is_active });
              }}
            >
              {u.is_active ? "Suspend" : "Activate"}
            </MenuItem>
            <MenuItem
              tone="danger"
              onClick={() => {
                close();
                removeUser(u);
              }}
            >
              Delete
            </MenuItem>
          </div>
        )}
      </ThreeDotMenu>
    );
  }

  const filtersActive = roleFilter !== "All" || statusFilter !== "All";

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-[#121B3B]">System Users</h2>
      <p className="mt-1 text-sm text-slate-500">
        Accounts that can sign in, with their assigned role.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
        >
          <option value="All">Role: All</option>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              Role: {r.label}
            </option>
          ))}
        </select>
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
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setRoleFilter("All");
              setStatusFilter("All");
            }}
            className="text-sm font-semibold text-telnet-primary hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {actionError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading users…</p>}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <p className="mt-4 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          No users match your search.
        </p>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <>
          <div className="mt-4 space-y-2 md:hidden">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">@{u.username}</p>
                    <p className="font-semibold text-slate-800">{fullName(u)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <StatusDot
                      label={u.is_active ? "Active" : "Suspended"}
                      tone={u.is_active ? "navy" : "red"}
                    />
                    {renderActions(u)}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                  <div>
                    <p className="text-slate-400">Role</p>
                    <p className="text-slate-700">{labelFor(u.role)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Department</p>
                    <p className="text-slate-700">{u.department || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400">Email</p>
                    <p className="truncate text-slate-700">{u.email || "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-xl bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06)] md:block">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-blue-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {fullName(u)}
                      </p>
                      <p className="text-xs text-slate-400">@{u.username}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot
                        label={labelFor(u.role)}
                        tone={ROLE_TONES[u.role] ?? "slate"}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.department || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot
                        label={u.is_active ? "Active" : "Suspended"}
                        tone={u.is_active ? "navy" : "red"}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">{renderActions(u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
