export interface AdminUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string | null;
  is_active: boolean;
  is_superuser: boolean;
  role: string; // admin | manager | driver | staff
  department: string | null;
  manager_type?: string | null;
}

export interface AdminRole {
  value: string;
  label: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
