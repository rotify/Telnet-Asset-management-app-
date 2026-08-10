export interface Staff {
  id: number;
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  department: string | null;
  branch: string | null;
  driver_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user: number | null;
}
