export interface Equipment {
  id: number;
  name: string;
  equipment_type: string;
  description: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  status: string;
  location: string | null;
  regional_office: string | null;
  cost: string | null;
  notes: string | null;
  subsidiary: string | null;
  serial_number: string | null;
  tag_number: string | null;
  assigned_user: string | null;
  quantity: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  assigned_staff: string | null;
  asset: number;
}

export interface Vehicle {
  id: number;
  name: string;
  license_plate: string;
  vin_number: string;
  make: string;
  model: string;
  asset_type: string;
  status: string;
  insurance_expiry: string | null;
  roadworthy_expiry: string | null;
  license_expiry: string | null;
  hackney_permit: string | null;
  cost: string | null;
  created_at: string;
  updated_at: string;
  assigned_staff: string | null;
  asset: number;
  fuel_type: string | null;
  current_mileage: string | null;
  department: string | null;
  year_of_manufacture: string | null;
  engine_number: string | null;
  color: string | null;
  service_interval_km: string | null;
  base_location: string | null;
  next_service_date: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
}
