// Role permission matrix (Figma: Role Permissions Editor).

export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = [
  { key: "vehicles", label: "Vehicles", hint: "Fleet registry, logs, and driver assignments" },
  { key: "equipment", label: "Equipment", hint: "IT assets, office hardware, and serial tags" },
  { key: "staff", label: "Staff", hint: "Employee records and assigned custody" },
  { key: "documents", label: "Documents", hint: "Insurance, roadworthiness, and permits" },
  { key: "maintenance", label: "Maintenance", hint: "Schedules, workshops, and cost logs" },
  { key: "work_orders", label: "Work Orders", hint: "Field jobs and repair tickets" },
  { key: "transfers", label: "Transfers", hint: "Inter-branch and staff asset transfers" },
  { key: "requests", label: "Requests", hint: "Requisitions and replacement petitions" },
  { key: "audits", label: "Audits", hint: "Asset audits, verification, and discrepancies" },
  { key: "reports", label: "Reports", hint: "Depreciation, cost analytics, and exports" },
  { key: "notifications", label: "Notifications", hint: "Email triggers, broadcast alerts, and reminders" },
  { key: "settings", label: "Settings", hint: "System parameters, thresholds, and categories" },
] as const;
export type PermissionModuleKey = (typeof PERMISSION_MODULES)[number]["key"];

export type ModulePermissions = Record<PermissionAction, boolean>;

export interface RolePermissions {
  role: string;
  modules: Record<PermissionModuleKey, ModulePermissions>;
}

// Roles shown in the editor. Staff and drivers are the same role.
export const EDITOR_ROLES = [
  { value: "admin", label: "Administrator", sub: "Super Admin (Root)", locked: true },
  { value: "manager", label: "Managers", sub: "Equipment, Vehicle & Document managers", locked: false },
  { value: "staff", label: "Staff", sub: "Standard Employee Access (includes drivers)", locked: false },
] as const;
