"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminRoles, getAdminUsers } from "@/lib/api";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import type { AdminRole, AdminUser } from "@/types/admin";

const ROLE_TONES: Record<string, StatusTone> = {
  admin: "red",
  manager: "orange",
  driver: "slate",
  staff: "navy",
};

// Staff and drivers are the same role in the UI.
const normRole = (role: string) => (role === "driver" ? "staff" : role);

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
        setRoles(r.filter((x) => x.value !== "driver"));
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
      const matchesRole = roleFilter === "All" || normRole(u.role) === roleFilter;
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" ? u.is_active : !u.is_active);
      const matchesSearch =
        !q ||
        `${u.username} ${fullName(u)} ${u.email ?? ""} ${u.department ?? ""} ${labelFor(normRole(u.role))}`
          .toLowerCase()
          .includes(q);
      return matchesRole && matchesStatus && matchesSearch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, search, roleFilter, statusFilter, roleLabel]);

  const filtersActive = roleFilter !== "All" || statusFilter !== "All";

  return (
    <section>
      <div className="mt-6 flex flex-wrap items-center gap-3">
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
                  <StatusDot
                    label={u.is_active ? "Active" : "Suspended"}
                    tone={u.is_active ? "navy" : "red"}
                    className="shrink-0"
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                  <div>
                    <p className="text-slate-400">Role</p>
                    <p className="text-slate-700">{labelFor(normRole(u.role))}</p>
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
                        label={labelFor(normRole(u.role))}
                        tone={ROLE_TONES[normRole(u.role)] ?? "slate"}
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
