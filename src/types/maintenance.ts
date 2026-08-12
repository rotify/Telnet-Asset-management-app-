export interface MaintenanceRecord {
  id: number;
  description: string;
  maintenance_date: string | null;
  due_date: string | null;
  cost: string | null;
  notes: string | null;
  equipment: number;
}

export interface AssetHistoryEntry {
  id: number;
  action: string;
  staff?: number | null;
  staff_name?: string | null;
  timestamp?: string;
  [key: string]: unknown;
}
