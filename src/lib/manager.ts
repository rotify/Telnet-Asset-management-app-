"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api";
import { getStoredToken } from "@/lib/auth";

export type ManagerType = "equipment" | "vehicles" | "documents";

export const MANAGER_TYPES: { value: ManagerType; label: string }[] = [
  { value: "equipment", label: "Equipment Manager" },
  { value: "vehicles", label: "Vehicles Manager" },
  { value: "documents", label: "Documents Manager" },
];

export function managerLabel(type: ManagerType | null): string {
  return MANAGER_TYPES.find((t) => t.value === type)?.label ?? "Manager";
}

// The backend has one "manager" role. The manager type comes from the
// user's manager_type field; until the backend stores that, fall back to
// the department name (e.g. "Vehicles" / "Fleet", "Equipment", "Documents").
export function resolveManagerType(u: {
  manager_type?: string | null;
  department?: string | null;
}): ManagerType | null {
  const direct = (u.manager_type ?? "").toLowerCase().trim();
  const hit = MANAGER_TYPES.find(
    (t) => t.value === direct || t.value.replace(/s$/, "") === direct
  );
  if (hit) return hit.value;
  const dept = (u.department ?? "").toLowerCase();
  if (/vehicle|fleet|transport/.test(dept)) return "vehicles";
  if (/equipment/.test(dept)) return "equipment";
  if (/document|records|compliance/.test(dept)) return "documents";
  return null;
}

export interface ManagerContext {
  loading: boolean;
  role: string | null;
  type: ManagerType | null;
  name: string;
  userId: number | null;
}

let cache: { token: string; ctx: ManagerContext } | null = null;

// Who is signed in, and (for managers) which assets they manage.
export function useManagerContext(): ManagerContext {
  const [ctx, setCtx] = useState<ManagerContext>(() => {
    const token = typeof window !== "undefined" ? getStoredToken() : null;
    return cache && token && cache.token === token
      ? cache.ctx
      : { loading: true, role: null, type: null, name: "", userId: null };
  });

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    if (cache && cache.token === token) return;
    getCurrentUser()
      .then((me) => {
        const next: ManagerContext = {
          loading: false,
          role: me.role ?? null,
          type: me.role === "manager" ? resolveManagerType(me) : null,
          name: `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || me.username,
          userId: me.id ?? null,
        };
        cache = { token, ctx: next };
        setCtx(next);
      })
      .catch(() =>
        setCtx({ loading: false, role: null, type: null, name: "", userId: null })
      );
  }, []);

  return ctx;
}

// Role lookup for routing (staff pages send managers to /manager).
export async function fetchRole(): Promise<string | null> {
  const token = getStoredToken();
  if (!token) return null;
  if (cache && cache.token === token) return cache.ctx.role;
  try {
    const me = await getCurrentUser();
    cache = {
      token,
      ctx: {
        loading: false,
        role: me.role ?? null,
        type: me.role === "manager" ? resolveManagerType(me) : null,
        name: `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || me.username,
        userId: me.id ?? null,
      },
    };
    return me.role ?? null;
  } catch {
    return null;
  }
}
