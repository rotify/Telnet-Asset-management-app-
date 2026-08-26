import { getStoredToken } from "@/lib/auth";
import type { Equipment, Vehicle } from "@/types/asset";
import type { Staff } from "@/types/staff";
import type { DocumentRecord } from "@/types/document";
import type { AssetHistoryEntry, MaintenanceRecord } from "@/types/maintenance";

function extractErrorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== "object") {
    return `Request failed (${status}).`;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;
  if (typeof obj.detail === "string") return obj.detail;

  // Django REST Framework validation errors look like:
  // { "driver_status": ["This field is required."], "email": ["Enter a valid email address."] }
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
  condition?: string;
  purchase_date?: string;
  cost?: string;
  supplier?: string;
  warranty_expiry?: string;
  service_interval_months?: string;
  next_service_date?: string;
  assigned_staff?: string;
  department?: string;
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
  asset_type?: string;
  make?: string;
  model?: string;
  year_of_manufacture?: string;
  vin_number?: string;
  engine_number?: string;
  fuel_type?: string;
  color?: string;
  status?: string;
  assigned_staff?: string;
  department?: string;
  current_mileage?: string;
  service_interval_km?: string;
  base_location?: string;
  next_service_date?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  roadworthy_expiry?: string;
  license_expiry?: string;
  cost?: string;
  notes?: string;
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

export function getStaff(): Promise<Staff[]> {
  return authedFetch<Staff[]>("/api/staff");
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
// Note: the {id} these three endpoints expect is the record's generic
// `asset` field (e.g. equipment.asset or vehicle.asset), not the
// equipment/vehicle's own `id`.

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