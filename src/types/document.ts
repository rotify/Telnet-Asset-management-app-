export interface DocumentRecord {
  id: number;
  name: string;
  document_type: string;
  description: string | null;
  issuing_authority: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  renewal_date: string | null;
  status: string;
  document_number: string | null;
  notify_days_before: number | null;
  location: string | null;
  responsible_person: string | null;
  notes: string | null;
  document_file: string | null;
  created_at: string;
  updated_at: string;
  related_vehicle: number | null;
  related_equipment: number | null;
  related_asset: number | null;
  responsible_staff: number | null;
  created_by: number | null;
}
