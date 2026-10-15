"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { getAdminUsers, getRolePermissions, saveRolePermissions } from "@/lib/api";
import { blankPermissions, defaultPermissions } from "@/lib/permission-defaults";
import {
  EDITOR_ROLES,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type PermissionAction,
  type PermissionModuleKey,
  type RolePermissions,
} from "@/types/permissions";

function roleUserKey(role: string): string {
  // Staff and drivers are the same role.
  return role === "driver" ? "staff" : role;
}

export default function RolePermissionsPage() {
  const [role, setRole] = useState<string>("staff");
  const [perms, setPerms] = useState<RolePermissions>(() => defaultPermissions("staff"));
  const [saved, setSaved] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const current = EDITOR_ROLES.find((r) => r.value === role)!;
  const locked = current.locked;

  useEffect(() => {
    getAdminUsers(200)
      .then((page) => {
        const c: Record<string, number> = {};
        page.results.forEach((u) => {
          const k = roleUserKey(u.role);
          c[k] = (c[k] ?? 0) + 1;
        });
        setCounts(c);
      })
      .catch(() => setCounts({}));
  }, []);

  const load = useCallback(async (r: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const data = await getRolePermissions(r);
      const base = blankPermissions(r);
      const merged: RolePermissions = {
        role: r,
        modules: { ...base.modules, ...(data.modules ?? {}) },
      };
      setPerms(merged);
      setSaved(JSON.stringify(merged));
      setUsingDefaults(false);
    } catch {
      // Backend has no saved permissions (or no endpoint yet): start from
      // sensible defaults so the matrix is still usable.
      const d = defaultPermissions(r);
      setPerms(d);
      setSaved(JSON.stringify(d));
      setUsingDefaults(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(role);
  }, [role, load]);

  const dirty = useMemo(() => JSON.stringify(perms) !== saved, [perms, saved]);

  function setCell(m: PermissionModuleKey, a: PermissionAction, v: boolean) {
    setSuccess(false);
    setPerms((p) => ({
      ...p,
      modules: { ...p.modules, [m]: { ...p.modules[m], [a]: v } },
    }));
  }

  function setRow(m: PermissionModuleKey, v: boolean) {
    setSuccess(false);
    setPerms((p) => ({
      ...p,
      modules: {
        ...p.modules,
        [m]: Object.fromEntries(
          PERMISSION_ACTIONS.map((a) => [a, v])
        ) as RolePermissions["modules"][PermissionModuleKey],
      },
    }));
  }

  function setAll(v: boolean) {
    setSuccess(false);
    setPerms((p) => blankPermissions(p.role, v));
  }

  async function save() {
    setError(null);
    setSuccess(false);
    setIsSaving(true);
    try {
      const res = await saveRolePermissions(role, perms);
      setSaved(JSON.stringify(perms));
      setUsingDefaults(false);
      setLocalOnly(res.localOnly);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Saving permissions needs backend support (PUT /api/v1/admin/roles/${role}/permissions/).`
          : "Couldn't save permissions."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminPageShell
      title="Role Permissions Editor"
      description="Define granular module access and export privileges across roles."
      breadcrumb={
        <>
          <Link href="/admin/dashboard" className="hover:underline">Dashboard</Link>
          {" / "}
          <Link href="/admin/staff" className="hover:underline">Users &amp; Roles</Link>
          {" / "}
          <span className="text-slate-600">Role Permissions Editor</span>
        </>
      }
      actions={
        <Link
          href="/admin/staff"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#121B3B] hover:bg-slate-50"
        >
          ← Back to Users List
        </Link>
      }
    >
      <div className="mt-6 flex gap-6 border-b border-slate-200 text-sm font-medium">
        <Link href="/admin/staff" className="pb-2 text-slate-500 hover:text-[#121B3B]">
          Users List
        </Link>
        <span className="border-b-2 border-telnet-primary pb-2 text-telnet-primary">
          Role Permissions Matrix{" "}
          <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs">
            {EDITOR_ROLES.length} Roles
          </span>
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Select role */}
        <div className="h-fit rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Select role to edit
          </p>
          <div className="space-y-2">
            {EDITOR_ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex w-full items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-left ${
                  role === r.value
                    ? "border-telnet-primary bg-blue-50/60"
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#121B3B]">{r.label}</p>
                  <p className="text-xs text-slate-400">{r.sub}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {r.locked
                    ? "Locked"
                    : `${counts[r.value] ?? 0} Users`}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            <div>
              <h2 className="text-base font-semibold text-[#121B3B]">
                {current.label} Permissions
                <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                  {current.value}
                </span>
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {locked
                  ? "Administrator access is fixed and can't be edited."
                  : role === "staff"
                  ? "Applies to all staff, including drivers: personal equipment custody, requests and verifications."
                  : "Oversight and approval access for managers."}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={locked}
                onClick={() => setAll(true)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#121B3B] hover:bg-slate-50 disabled:opacity-50"
              >
                Grant All
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => setAll(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#121B3B] hover:bg-slate-50 disabled:opacity-50"
              >
                Revoke All
              </button>
            </div>
          </div>

          {usingDefaults && !isLoading && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No saved permissions found for this role, so suggested defaults
              are shown. Review them and press Save.
            </p>
          )}

          <div className="overflow-x-auto rounded-xl bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
            {isLoading ? (
              <p className="p-6 text-sm text-slate-500">Loading permissions…</p>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-blue-50/60 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Module</th>
                    {PERMISSION_ACTIONS.map((a) => (
                      <th key={a} className="px-3 py-3 text-center">{a}</th>
                    ))}
                    <th className="px-3 py-3 text-center">All</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((m) => {
                    const row = perms.modules[m.key];
                    const all = PERMISSION_ACTIONS.every((a) => row[a]);
                    return (
                      <tr key={m.key} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#121B3B]">{m.label}</p>
                          <p className="text-xs text-slate-400">{m.hint}</p>
                        </td>
                        {PERMISSION_ACTIONS.map((a) => (
                          <td key={a} className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${m.label} ${a}`}
                              checked={row[a]}
                              disabled={locked}
                              onChange={(e) => setCell(m.key, a, e.target.checked)}
                              className="h-4 w-4 accent-[#0B8CE9]"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            aria-label={`${m.label} all`}
                            checked={all}
                            disabled={locked}
                            onChange={(e) => setRow(m.key, e.target.checked)}
                            className="h-4 w-4 accent-[#0B8CE9]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-600">
              {localOnly
                ? "Permissions saved on this device. The backend doesn't store role permissions yet, so they aren't enforced server-side."
                : "Permissions saved."}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={locked || isSaving || (!dirty && !usingDefaults)}
              className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
            {dirty && !isSaving && (
              <span className="text-xs text-slate-400">Unsaved changes</span>
            )}
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
