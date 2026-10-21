export interface VehicleMaintenance {
  id: number;
  vehicle: number;
  vehicle_name?: string | null;
  description: string;
  cost: string | null;
  notes: string | null;
  maintenance_date?: string | null;
  due_date?: string | null;
}

export interface VehicleMaintenancePayload {
  vehicle: number;
  description: string;
  cost?: string;
  notes?: string;
  due_date?: string;
}

export interface EquipmentTransfer {
  id: number;
  equipment: number;
  equipment_name?: string | null;
  destination: string;
  department: string | null;
  reason: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface EquipmentTransferPayload {
  equipment: number;
  destination: string;
  department?: string;
  reason?: string;
}

export interface DriverRequest {
  id: number;
  requested_by?: number | null;
  requested_by_name?: string | null;
  requester_user?: number | null;
  details?: string | null;
  preferred_date?: string | null;
  requested_start?: string | null;
  requested_end?: string | null;
  // requested -> approved (or rejected) -> assigned
  status: string;
  approval_approver?: number | null;
  approved_by?: number | null;
  approved_at?: string | null;
  requires_superadmin_approval?: boolean;
  rejected_by?: number | null;
  rejected_at?: string | null;
  rejection_note?: string | null;
  assigned_driver?: number | null;
  assigned_driver_name?: string | null;
  assigned_vehicle?: number | null;
  assigned_by?: number | null;
  assigned_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface DriverRequestPayload {
  details: string;
  preferred_date?: string;
  requested_start?: string;
  requested_end?: string;
}

export interface AvailableVehicle {
  id: number;
  name?: string | null;
  license_plate?: string | null;
  make?: string | null;
  model?: string | null;
}

// One approval step assigned to a person (supervisor, reporting manager or
// the admin fallback). The request advances once all its records approve.
export interface ApprovalRecord {
  id: number;
  target_type: string; // driver_request | asset_assignment_request
  target_id: number;
  asset_assignment_request: number | null;
  driver_request: number | null;
  approver: number | null;
  approver_type: string; // supervisor | reporting_manager | admin ...
  status: string; // pending | approved | rejected | cancelled
  acted_by: number | null;
  acted_at: string | null;
  rejection_note?: string | null;
  created_at?: string | null;
}

export interface AssetAssignmentRequest {
  id: number;
  asset: number;
  previous_staff: number | null;
  requested_staff: number | null;
  requested_by: number | null;
  status?: string;
  [key: string]: unknown;
}
