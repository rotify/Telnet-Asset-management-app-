export interface WorkOrder {
  id: number;
  equipment: number;
  equipment_name: string;
  work_type: string; // e.g. "repair", "certification"
  title?: string | null;
  description?: string | null;
  status: string; // e.g. "open"
  priority: string; // e.g. "high"
  due_date: string | null;
  notes: string | null;
}
