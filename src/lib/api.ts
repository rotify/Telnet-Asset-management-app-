import { clearStoredSession, getStoredToken } from "@/lib/auth";
import type { Equipment, Vehicle } from "@/types/asset";
import type { Staff } from "@/types/staff";
import type { DocumentRecord } from "@/types/document";
import type { AssetHistoryEntry, MaintenanceRecord } from "@/types/maintenance";
import type { WorkOrder } from "@/types/work-order";
import type {
  EquipmentTransfer,
  EquipmentTransferPayload,
  VehicleMaintenance,
  VehicleMaintenancePayload,
} from "@/types/workflow";
import type { AdminRole, AdminUser, Paginated } from "@/types/admin";
import type { RolePermissions } from "@/types/permissions";

// An expired or invalid token can never recover on its own: drop the stored
// session and send the user to sign in again.
function handleUnauthorized(status: number) {
  if (status === 401 && typeof window !== "undefined") {
    clearStoredSession();
    window.location.href = "/login";
  }
}

function extractErrorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== "object") {
    return `Request failed (${status}).`;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;
  if (typeof obj.detail === "string") return obj.detail;

  
  const fieldMessages: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      const joined = value.filter((v) => typeof v === "string").join(" ");
      if (joined) fieldMessages.push(`${key}: ${joined}`);
    } else if (typeof value === "string") {
      fieldMessages.push(`${key}: ${value}`);
    }
  }
  if (fieldMessages.length > 0) return fieldMessages.join(" | ");

  return `Request failed (${status}).`;
}

async function authedFetch<T>(path: string): Promise<T> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("You're not signed in.");
  }

  const res = await fetch(path, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(extractErrorMessage(data, res.status));
  }

  return data as T;
}

async function authedMutate<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("You're not signed in.");
  }

  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(extractErrorMessage(data, res.status));
  }

  return data as T;
}

export function getEquipment(): Promise<Equipment[]> {
  return authedFetch<Equipment[]>("/api/equipment");
}

export interface EquipmentPayload {
  name: string;
  equipment_type?: string;
  serial_number?: string;
  manufacturer?: string;
  model_number?: string;
  status?: string;
  purchase_date?: string;
  cost?: string;
  supplier?: string;
  warranty_expiry?: string;
  service_interval_months?: string;
  next_service_date?: string;
  assigned_staff?: number | null;
  regional_office?: string;
  location?: string;
  notes?: string;
}

export function createEquipment(
  payload: EquipmentPayload
): Promise<Equipment> {
  return authedMutate<Equipment>("/api/equipment", "POST", payload);
}

export function updateEquipment(
  id: number,
  payload: Partial<EquipmentPayload>
): Promise<Equipment> {
  return authedMutate<Equipment>(`/api/equipment/${id}`, "PUT", payload);
}

export function deleteEquipment(id: number): Promise<void> {
  return authedMutate<void>(`/api/equipment/${id}`, "DELETE");
}

export function getVehicles(): Promise<Vehicle[]> {
  return authedFetch<Vehicle[]>("/api/vehicles");
}

export interface VehiclePayload {
  name: string;
  license_plate?: string;
  vin_number?: string;
  make?: string;
  model?: string;
  asset_type?: string;
  status?: string;
  insurance_expiry?: string;
  roadworthy_expiry?: string;
  license_expiry?: string;
  hackney_permit?: string;
  cost?: string;
  assigned_staff?: number | null;
}

export function createVehicle(payload: VehiclePayload): Promise<Vehicle> {
  return authedMutate<Vehicle>("/api/vehicles", "POST", payload);
}

export function updateVehicle(
  id: number,
  payload: Partial<VehiclePayload>
): Promise<Vehicle> {
  return authedMutate<Vehicle>(`/api/vehicles/${id}`, "PUT", payload);
}

export function deleteVehicle(id: number): Promise<void> {
  return authedMutate<void>(`/api/vehicles/${id}`, "DELETE");
}

function staffArray(data: unknown): Staff[] {
  if (Array.isArray(data)) return data as Staff[];
  const results = (data as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as Staff[]) : [];
}

// Legacy /api/staff/ first; if it comes back empty (or fails) fall back to
// the admin staff directory, which is where provisioned staff live.
export async function getStaff(): Promise<Staff[]> {
  let legacyError: unknown = null;
  let list: Staff[] = [];
  try {
    list = staffArray(await authedFetch<unknown>("/api/staff"));
  } catch (err) {
    legacyError = err;
  }
  if (list.length > 0) return list;

  try {
    const admin = staffArray(await authedFetch<unknown>("/api/admin/staff?page_size=200"));
    if (admin.length > 0) return admin;
  } catch (err) {
    if (legacyError) throw legacyError;
    void err;
  }
  if (legacyError) throw legacyError;
  return list;
}

export interface StaffPayload {
  staff_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  department?: string | null;
  branch?: string | null;
  is_active?: boolean;
  phone_number?: string;
  date_of_birth?: string;
  home_address?: string;
  job_title?: string;
  system_role?: string;
  employment_type?: string;
  date_joined?: string;
  status?: string;
  reporting_manager?: string;
  work_location?: string;
  drivers_licence_number?: string;
  licence_expiry?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

export function createStaff(payload: StaffPayload): Promise<Staff> {
  return authedMutate<Staff>("/api/staff", "POST", payload);
}

export function updateStaff(
  id: number,
  payload: StaffPayload
): Promise<Staff> {
  return authedMutate<Staff>(`/api/staff/${id}`, "PUT", payload);
}

export function deleteStaff(id: number): Promise<void> {
  return authedMutate<void>(`/api/staff/${id}`, "DELETE");
}

// Documents

export interface DocumentPayload {
  name: string;
  document_type: string;
  description?: string;
  issuing_authority?: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
  document_number?: string;
  notify_days_before?: number;
  location?: string;
}

export function getDocuments(): Promise<DocumentRecord[]> {
  return authedFetch<DocumentRecord[]>("/api/documents");
}

export function createDocument(
  payload: DocumentPayload
): Promise<DocumentRecord> {
  return authedMutate<DocumentRecord>("/api/documents", "POST", payload);
}

export function updateDocument(
  id: number,
  payload: Partial<DocumentPayload>
): Promise<DocumentRecord> {
  return authedMutate<DocumentRecord>(`/api/documents/${id}`, "PUT", payload);
}

export function deleteDocument(id: number): Promise<void> {
  return authedMutate<void>(`/api/documents/${id}`, "DELETE");
}

// Document file upload — needs multipart/form-data, so it bypasses
// authedMutate (which always JSON-encodes) and builds its own request.
async function authedMutateFormData<T>(
  path: string,
  method: "POST" | "PUT",
  formData: FormData
): Promise<T> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("You're not signed in.");
  }

  const res = await fetch(path, {
    method,
    headers: { Authorization: `Token ${token}` },
    body: formData,
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(extractErrorMessage(data, res.status));
  }

  return data as T;
}

export function createDocumentWithFile(
  payload: DocumentPayload,
  file: File | null
): Promise<DocumentRecord> {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });
  if (file) {
    formData.append("document_file", file);
  }
  return authedMutateFormData<DocumentRecord>(
    "/api/documents",
    "POST",
    formData
  );
}

export function updateDocumentWithFile(
  id: number,
  payload: Partial<DocumentPayload>,
  file: File | null
): Promise<DocumentRecord> {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });
  if (file) {
    formData.append("document_file", file);
  }
  return authedMutateFormData<DocumentRecord>(
    `/api/documents/${id}`,
    "PUT",
    formData
  );
}

// The backend returns document_file as a relative /media/... path.
const DOCUMENT_MEDIA_ORIGIN = "http://207.180.246.69:7038";

export function documentFileUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${DOCUMENT_MEDIA_ORIGIN}${path}`;
}

// Equipment maintenance

export interface MaintenancePayload {
  equipment: number;
  description: string;
  due_date: string;
  cost?: string;
  notes?: string;
}

export function getEquipmentMaintenance(): Promise<MaintenanceRecord[]> {
  return authedFetch<MaintenanceRecord[]>("/api/equipment-maintenance");
}

export function createEquipmentMaintenance(
  payload: MaintenancePayload
): Promise<MaintenanceRecord> {
  return authedMutate<MaintenanceRecord>(
    "/api/equipment-maintenance",
    "POST",
    payload
  );
}

export function updateEquipmentMaintenance(
  id: number,
  payload: Partial<MaintenancePayload>
): Promise<MaintenanceRecord> {
  return authedMutate<MaintenanceRecord>(
    `/api/equipment-maintenance/${id}`,
    "PUT",
    payload
  );
}

export function deleteEquipmentMaintenance(id: number): Promise<void> {
  return authedMutate<void>(`/api/equipment-maintenance/${id}`, "DELETE");
}

// CSV exports (server-generated)

async function authedFetchText(path: string): Promise<string> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("You're not signed in.");
  }

  const res = await fetch(path, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Request failed (${res.status}).`);
  }

  return res.text();
}

export function exportVehiclesCsv(): Promise<string> {
  return authedFetchText("/api/export/vehicles/csv");
}

export function exportEquipmentCsv(): Promise<string> {
  return authedFetchText("/api/export/equipment/csv");
}

// Asset assign / release / history


export function assignAsset(
  assetId: number,
  staffId: number
): Promise<unknown> {
  return authedMutate(`/api/asset/${assetId}/assign`, "POST", {
    staff_id: staffId,
  });
}

export function releaseAsset(assetId: number): Promise<unknown> {
  return authedMutate(`/api/asset/${assetId}/release`, "POST", {});
}

export function getAssetHistory(
  assetId: number
): Promise<AssetHistoryEntry[]> {
  return authedFetch<AssetHistoryEntry[]>(`/api/asset/${assetId}/history`);
}

// Notifications (v1)

export interface NotificationSchedule {
  id: number;
  schedule_time: string;
  alert_days: number;
  is_enabled: boolean;
  last_sent: string | null;
  updated_at: string;
}

export interface NotificationSchedulePayload {
  is_enabled?: boolean;
  alert_days?: number;
  schedule_time?: string;
}

export function getNotificationSchedule(): Promise<NotificationSchedule> {
  return authedFetch<NotificationSchedule>("/api/v1/notifications/schedule");
}

export function updateNotificationSchedule(
  payload: NotificationSchedulePayload
): Promise<NotificationSchedule> {
  return authedMutate<NotificationSchedule>(
    "/api/v1/notifications/schedule",
    "PATCH",
    payload
  );
}

export interface NotificationRecipient {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface NotificationRecipientPayload {
  email: string;
  full_name: string;
  is_active?: boolean;
}

export function getNotificationRecipients(): Promise<{
  count: number;
  results: NotificationRecipient[];
}> {
  return authedFetch("/api/v1/notifications/recipients");
}

export function createNotificationRecipient(
  payload: NotificationRecipientPayload
): Promise<NotificationRecipient> {
  return authedMutate(
    "/api/v1/notifications/recipients",
    "POST",
    payload
  );
}

// Delivery item shape isn't confirmed against live data yet beyond
// {id, status} (from the retry response) — kept loose on purpose so
// unexpected fields don't break rendering.
export interface NotificationDelivery {
  id: number;
  status: string;
  [key: string]: unknown;
}

export function getNotificationDeliveries(): Promise<{
  count: number;
  results: NotificationDelivery[];
}> {
  return authedFetch("/api/v1/notifications/deliveries");
}

export function sendNotificationsNow(): Promise<{
  status: string;
  sent_count: number;
}> {
  return authedMutate("/api/v1/notifications/send-now", "POST", {});
}

export function retryNotificationDelivery(
  id: number
): Promise<{ id: number; status: string }> {
  return authedMutate(
    `/api/v1/notifications/deliveries/${id}/retry`,
    "POST",
    {}
  );
}

// Reports (v1)

export interface ReportOverview {
  generated_at: string;
  assets: { total: number; active: number; unassigned: number };
  vehicles: number;
  equipment: number;
  documents: { total: number; expired: number; expiring: number };
  maintenance: { vehicle_cost: number; equipment_cost: number };
}

export function getReportOverview(): Promise<ReportOverview> {
  return authedFetch<ReportOverview>("/api/v1/reports/overview");
}

// These report endpoints return { count, results: [...] } — the shape
// of each result row isn't confirmed against live data yet, so results
// are kept as loose records rather than guessed at.
export interface ReportListResponse {
  count: number;
  results: Record<string, unknown>[];
}

export function getVehiclesReport(): Promise<ReportListResponse> {
  return authedFetch("/api/v1/reports/vehicles");
}

export function getEquipmentReport(): Promise<ReportListResponse> {
  return authedFetch("/api/v1/reports/equipment");
}

export function getDocumentsReport(): Promise<ReportListResponse> {
  return authedFetch("/api/v1/reports/documents");
}

export interface MaintenanceReport {
  summary: {
    vehicle_count: number;
    equipment_count: number;
    vehicle_cost: number;
    equipment_cost: number;
  };
  vehicles: Record<string, unknown>[];
  equipment: Record<string, unknown>[];
}

export function getMaintenanceReport(): Promise<MaintenanceReport> {
  return authedFetch<MaintenanceReport>("/api/v1/reports/maintenance");
}

export function getTransfersReport(): Promise<ReportListResponse> {
  return authedFetch("/api/v1/reports/transfers");
}

export function getAuditReport(): Promise<ReportListResponse> {
  return authedFetch("/api/v1/reports/audit");
}

// Settings (v1)

export interface OrganizationSettings {
  name: string;
  timezone: string;
  file_upload_max_size_mb: number;
}

export function getOrganizationSettings(): Promise<OrganizationSettings> {
  return authedFetch<OrganizationSettings>("/api/v1/settings/organization");
}

export interface ProfileSettings {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface ProfileSettingsPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export function getProfileSettings(): Promise<ProfileSettings> {
  return authedFetch<ProfileSettings>("/api/v1/settings/profile");
}

export function updateProfileSettings(
  payload: ProfileSettingsPayload
): Promise<ProfileSettings> {
  return authedMutate<ProfileSettings>(
    "/api/v1/settings/profile",
    "PATCH",
    payload
  );
}
export interface NotificationSettings {
  id: number;
  schedule_time: string;
  alert_days: number;
  is_enabled: boolean;
  last_sent: string | null;
  updated_at: string;
}

export function getNotificationSettings(): Promise<NotificationSettings> {
  return authedFetch<NotificationSettings>("/api/v1/settings/notifications");
}

export function updateNotificationSettings(
  payload: Partial<Pick<NotificationSettings, "schedule_time" | "alert_days" | "is_enabled">>
): Promise<NotificationSettings> {
  return authedMutate<NotificationSettings>(
    "/api/v1/settings/notifications",
    "PATCH",
    payload
  );
}

export function changePassword(payload: {
  current_password: string;
  new_password: string;
  password_confirm: string;
}): Promise<{ detail: string }> {
  return authedMutate<{ detail: string }>(
    "/api/remote/v1/settings/password",
    "POST",
    payload
  );
}

// Maintenance due / emergency requests
export interface MaintenanceDueItem {
  [key: string]: unknown;
}
export interface MaintenanceRequest {
  id?: number;
  asset_description?: string;
  issue_description?: string;
  submitted_by?: string | null;
  created_at?: string | null;
  photo?: string | null;
  [key: string]: unknown;
}

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const results = (data as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as T[]) : [];
}

export async function getMaintenanceDue(): Promise<MaintenanceDueItem[]> {
  return asList<MaintenanceDueItem>(
    await authedFetch<unknown>("/api/remote/maintenance/due")
  );
}

export async function getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  return asList<MaintenanceRequest>(
    await authedFetch<unknown>("/api/remote/maintenance/requests")
  );
}

// Staff / drivers only on the backend; admin tokens are rejected.
export function submitMaintenanceRequest(
  payload: { asset_description: string; issue_description: string },
  photo?: File | null
): Promise<MaintenanceRequest> {
  const formData = new FormData();
  formData.append("asset_description", payload.asset_description);
  formData.append("issue_description", payload.issue_description);
  if (photo) formData.append("photo", photo);
  return authedMutateFormData<MaintenanceRequest>(
    "/api/remote/maintenance/requests",
    "POST",
    formData
  );
}

export function getEquipmentWorkOrders(): Promise<WorkOrder[]> {
  return authedFetch<WorkOrder[]>("/api/equipment-work-orders");
}

// Admin API v1 (users / roles) -- proxied to the newer backend.
export function getAdminUsers(pageSize = 100): Promise<Paginated<AdminUser>> {
  return authedFetch<Paginated<AdminUser>>(
    `/api/admin/users?page_size=${pageSize}`
  );
}

// Role permission matrix. Proposed backend contract:
//   GET / PUT /api/v1/admin/roles/{role}/permissions/
export function getRolePermissions(role: string): Promise<RolePermissions> {
  return authedFetch<RolePermissions>(
    `/api/remote/v1/admin/roles/${role}/permissions`
  );
}
export function saveRolePermissions(
  role: string,
  payload: RolePermissions
): Promise<RolePermissions> {
  return authedMutate<RolePermissions>(
    `/api/remote/v1/admin/roles/${role}/permissions`,
    "PUT",
    payload
  );
}

export function getAdminRoles(): Promise<AdminRole[]> {
  return authedFetch<AdminRole[]>("/api/admin/roles");
}

// ---------------------------------------------------------------------
// Newer backend endpoints (proxied through /api/remote/*)
// ---------------------------------------------------------------------

export function getCurrentUser(): Promise<{
  id?: number;
  username: string;
  role: string;
  staff_id?: number | null;
}> {
  return authedFetch("/api/remote/me");
}

// Vehicle maintenance
export function getVehicleMaintenance(
  vehicleId?: number
): Promise<VehicleMaintenance[]> {
  const q = vehicleId ? `?vehicle=${vehicleId}` : "";
  return authedFetch<VehicleMaintenance[]>(`/api/remote/vehicle-maintenance${q}`);
}
export function createVehicleMaintenance(
  payload: VehicleMaintenancePayload
): Promise<VehicleMaintenance> {
  return authedMutate<VehicleMaintenance>(
    "/api/remote/vehicle-maintenance",
    "POST",
    payload
  );
}
export function updateVehicleMaintenance(
  id: number,
  payload: Partial<VehicleMaintenancePayload>
): Promise<VehicleMaintenance> {
  return authedMutate<VehicleMaintenance>(
    `/api/remote/vehicle-maintenance/${id}`,
    "PATCH",
    payload
  );
}
export function deleteVehicleMaintenance(id: number): Promise<void> {
  return authedMutate<void>(`/api/remote/vehicle-maintenance/${id}`, "DELETE");
}

// Equipment transfers
export function getEquipmentTransfers(
  equipmentId?: number
): Promise<EquipmentTransfer[]> {
  const q = equipmentId ? `?equipment=${equipmentId}` : "";
  return authedFetch<EquipmentTransfer[]>(`/api/remote/equipment-transfers${q}`);
}
export function getEquipmentTransfer(id: number): Promise<EquipmentTransfer> {
  return authedFetch<EquipmentTransfer>(`/api/remote/equipment-transfers/${id}`);
}
export function createEquipmentTransfer(
  payload: EquipmentTransferPayload
): Promise<EquipmentTransfer> {
  return authedMutate<EquipmentTransfer>(
    "/api/remote/equipment-transfers",
    "POST",
    payload
  );
}

// Admin users / staff (create + edit)
export function getAdminUser(id: number): Promise<AdminUser> {
  return authedFetch<AdminUser>(`/api/remote/v1/admin/users/${id}`);
}
export function createAdminUser(payload: Partial<AdminUser> & { password?: string }): Promise<AdminUser> {
  return authedMutate<AdminUser>("/api/remote/v1/admin/users", "POST", payload);
}
export function updateAdminUser(id: number, payload: Partial<AdminUser>): Promise<AdminUser> {
  return authedMutate<AdminUser>(`/api/remote/v1/admin/users/${id}`, "PATCH", payload);
}
// Admin provisioning: creates the staff record AND its login in one call.
export function createAdminStaff(
  payload: StaffPayload & { password: string }
): Promise<Staff> {
  return authedMutate<Staff>("/api/remote/v1/admin/staff", "POST", payload);
}
export function updateAdminStaff(id: number, payload: Partial<Staff>): Promise<Staff> {
  return authedMutate<Staff>(`/api/remote/v1/admin/staff/${id}`, "PATCH", payload);
}
export function deleteAdminStaff(id: number): Promise<void> {
  return authedMutate<void>(`/api/remote/v1/admin/staff/${id}`, "DELETE");
}

// Notification recipients (edit / remove)
export function updateNotificationRecipient(
  id: number,
  payload: Partial<NotificationRecipient>
): Promise<NotificationRecipient> {
  return authedMutate<NotificationRecipient>(
    `/api/remote/v1/notifications/recipients/${id}`,
    "PATCH",
    payload
  );
}
export function deleteNotificationRecipient(id: number): Promise<void> {
  return authedMutate<void>(`/api/remote/v1/notifications/recipients/${id}`, "DELETE");
}

// Bulk uploads (multipart)
export interface BulkUploadResult {
  created?: number;
  errors?: unknown[];
  [key: string]: unknown;
}
async function uploadFile(path: string, file: File): Promise<BulkUploadResult> {
  const token = getStoredToken();
  if (!token) throw new Error("You're not signed in.");
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Token ${token}` },
    body: formData,
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(extractErrorMessage(data, res.status));
  return data as BulkUploadResult;
}
export function bulkUploadAssets(file: File): Promise<BulkUploadResult> {
  return uploadFile("/api/remote/bulk-upload-assets", file);
}
export function bulkUploadEquipment(file: File): Promise<BulkUploadResult> {
  return uploadFile("/api/remote/bulk-upload-equipment", file);
}
