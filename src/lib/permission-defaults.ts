import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type ModulePermissions,
  type PermissionAction,
  type PermissionModuleKey,
  type RolePermissions,
} from "@/types/permissions";

export function emptyModule(value = false): ModulePermissions {
  return Object.fromEntries(
    PERMISSION_ACTIONS.map((a) => [a, value])
  ) as ModulePermissions;
}

export function blankPermissions(role: string, value = false): RolePermissions {
  return {
    role,
    modules: Object.fromEntries(
      PERMISSION_MODULES.map((m) => [m.key, emptyModule(value)])
    ) as Record<PermissionModuleKey, ModulePermissions>,
  };
}

// Starting points used until the backend returns saved permissions.
export function defaultPermissions(role: string): RolePermissions {
  if (role === "admin") return blankPermissions(role, true);
  const p = blankPermissions(role);
  const set = (m: PermissionModuleKey, actions: PermissionAction[]) => {
    actions.forEach((a) => (p.modules[m][a] = true));
  };
  if (role === "manager" || role.endsWith("_manager")) {
    (
      ["vehicles", "equipment", "documents", "maintenance", "work_orders", "transfers", "requests", "audits", "reports", "notifications"] as PermissionModuleKey[]
    ).forEach((m) => set(m, ["view", "create", "edit", "export"]));
    set("staff", ["view"]);
    set("requests", ["approve"]);
    set("transfers", ["approve"]);
    return p;
  }
  // staff (incl. drivers)
  set("equipment", ["view"]);
  set("vehicles", ["view"]);
  set("requests", ["view", "create"]);
  set("maintenance", ["view", "create"]);
  set("notifications", ["view"]);
  return p;
}
