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
