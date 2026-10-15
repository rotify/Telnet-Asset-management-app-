// Column definitions + row validation for the Excel bulk import.

export type ImportKind = "Staff" | "Vehicles" | "Equipment" | "Documents";

export interface ColumnSpec {
  header: string;
  key: string;
  required?: boolean;
  kind?: "text" | "date" | "number" | "int" | "enum";
  options?: string[]; // allowed values (enum)
  hint?: string;
}

const VEHICLE_TYPES = ["car", "truck", "van", "bus", "motorbike"];
const STATUSES = ["active", "pending_certification", "inactive"];
const EQUIPMENT_TYPES = [
  "computer", "laptop", "printer", "scanner", "copier", "ac", "generator",
  "furniture", "phone", "appliance", "safety", "network", "electronics",
  "office_supplies", "other",
];
const DOC_TYPES = ["insurance", "license", "warranty", "receipt"];
const ROLES = ["staff", "driver", "manager", "admin"];

export const SPECS: Record<ImportKind, ColumnSpec[]> = {
  Staff: [
    { header: "Employee ID", key: "staff_id", required: true },
    { header: "First Name", key: "first_name", required: true },
    { header: "Last Name", key: "last_name", required: true },
    { header: "Email", key: "email", required: true, hint: "Login details are emailed here" },
    { header: "Department", key: "department" },
    { header: "Branch", key: "branch" },
    { header: "Role", key: "role", kind: "enum", options: ROLES, hint: "Default: staff" },
  ],
  Vehicles: [
    { header: "Name", key: "name", required: true },
    { header: "License Plate", key: "license_plate" },
    { header: "VIN", key: "vin_number" },
    { header: "Make", key: "make" },
    { header: "Model", key: "model" },
    { header: "Vehicle Type", key: "asset_type", kind: "enum", options: VEHICLE_TYPES },
    { header: "Status", key: "status", kind: "enum", options: STATUSES },
    { header: "Insurance Expiry", key: "insurance_expiry", kind: "date" },
    { header: "Roadworthy Expiry", key: "roadworthy_expiry", kind: "date" },
    { header: "License Expiry", key: "license_expiry", kind: "date" },
    { header: "Hackney Permit Expiry", key: "hackney_permit", kind: "date" },
    { header: "Cost", key: "cost", kind: "number" },
    { header: "Assigned Driver (Employee ID)", key: "assigned_to", hint: "Must be a driver" },
  ],
  Equipment: [
    { header: "Name", key: "name", required: true },
    { header: "Category", key: "equipment_type", kind: "enum", options: EQUIPMENT_TYPES },
    { header: "Serial Number", key: "serial_number" },
    { header: "Manufacturer", key: "manufacturer" },
    { header: "Model Number", key: "model_number" },
    { header: "Status", key: "status", kind: "enum", options: STATUSES },
    { header: "Purchase Date", key: "purchase_date", kind: "date" },
    { header: "Cost", key: "cost", kind: "number" },
    { header: "Supplier", key: "supplier" },
    { header: "Warranty Expiry", key: "warranty_expiry", kind: "date" },
    { header: "Service Interval (months)", key: "service_interval_months", kind: "int" },
    { header: "Next Service Date", key: "next_service_date", kind: "date" },
    { header: "Assigned Staff (Employee ID)", key: "assigned_to" },
    { header: "Regional Office", key: "regional_office" },
    { header: "Location", key: "location" },
    { header: "Notes", key: "notes" },
  ],
  Documents: [
    { header: "Name", key: "name", required: true },
    { header: "Document Type", key: "document_type", required: true, kind: "enum", options: DOC_TYPES },
    { header: "Document Number", key: "document_number" },
    { header: "Issuing Authority", key: "issuing_authority" },
    { header: "Issue Date", key: "issue_date", kind: "date" },
    { header: "Expiry Date", key: "expiry_date", kind: "date" },
    { header: "Status", key: "status" },
    { header: "Notify Days Before", key: "notify_days_before", kind: "int" },
    { header: "Location", key: "location" },
    { header: "Description", key: "description" },
  ],
};

export const IMPORT_ORDER: ImportKind[] = ["Staff", "Vehicles", "Equipment", "Documents"];

const norm = (s: string) =>
  s.toLowerCase().replace(/\*/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function parseDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "";
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let y: number, mo: number, d: number;
  if (m) {
    [y, mo, d] = [+m[1], +m[2], +m[3]];
  } else if ((m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))) {
    // Day first (dd/mm/yyyy), the usual format for Nigerian sheets.
    [d, mo, y] = [+m[1], +m[2], +m[3]];
  } else {
    const t = Date.parse(v);
    if (Number.isNaN(t)) return null;
    const dt = new Date(t);
    [y, mo, d] = [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];
  }
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export interface ParsedRow {
  rowNumber: number; // row number in the sheet (1-based, header = 1)
  values: Record<string, string>;
  errors: string[];
}

// Turns raw sheet rows into validated records, matching columns by header
// name (case/punctuation-insensitive) so column order doesn't matter.
export function parseSheet(kind: ImportKind, rows: string[][]): ParsedRow[] {
  const spec = SPECS[kind];
  if (rows.length === 0) return [];
  const headerIdx = new Map<string, number>();
  rows[0].forEach((h, i) => headerIdx.set(norm(h ?? ""), i));
  const cols = spec.map((c) => ({ c, idx: headerIdx.get(norm(c.header)) }));
  const missing = cols.filter((x) => x.c.required && x.idx === undefined);
  const out: ParsedRow[] = [];

  rows.slice(1).forEach((r, i) => {
    if (r.every((c) => !String(c ?? "").trim())) return; // blank row
    const values: Record<string, string> = {};
    const errors: string[] = missing.map((m) => `Column "${m.c.header}" is missing`);
    for (const { c, idx } of cols) {
      let v = idx === undefined ? "" : String(r[idx] ?? "").trim();
      if (!v) {
        if (c.required && idx !== undefined) errors.push(`${c.header} is required`);
        continue;
      }
      if (c.kind === "date") {
        const d = parseDate(v);
        if (d === null) errors.push(`${c.header}: "${v}" isn't a valid date`);
        else v = d;
      } else if (c.kind === "number") {
        const n = v.replace(/[^0-9.\-]/g, "");
        if (!n || Number.isNaN(Number(n))) errors.push(`${c.header}: "${v}" isn't a number`);
        else v = String(Number(n));
      } else if (c.kind === "int") {
        const n = Number(v.replace(/[^0-9]/g, ""));
        if (!v.replace(/[^0-9]/g, "")) errors.push(`${c.header}: "${v}" isn't a whole number`);
        else v = String(n);
      } else if (c.kind === "enum" && c.options) {
        const key = v.toLowerCase().replace(/[\s\/-]+/g, "_");
        const hit = c.options.find((o) => o === key || o.replace(/_/g, "") === key.replace(/_/g, ""));
        if (!hit) errors.push(`${c.header}: "${v}" must be one of ${c.options.join(", ")}`);
        else v = hit;
      }
      values[c.key] = v;
    }
    out.push({ rowNumber: i + 2, values, errors });
  });
  return out;
}

export function templateRows(): { name: string; rows: string[][] }[] {
  const guide: string[][] = [
    ["Telnet Asset Manager: bulk import guide"],
    [""],
    ["Fill one sheet per record type. Leave sheets you don't need empty. Keep the header row."],
    ["Columns marked * are required. Dates: DD/MM/YYYY or YYYY-MM-DD. Costs: numbers only."],
    ["Import order: Staff, Vehicles, Equipment, Documents. Employee IDs link assets to people."],
    ["Vehicles can only be assigned to staff whose Role is driver."],
    ["New staff get a login; their temporary password is emailed to the Email column."],
    ["Rows already in the system (same Employee ID, plate or serial number) are skipped."],
    [""],
    ["Allowed values"],
    ["Role", ROLES.join(", ")],
    ["Vehicle Type", VEHICLE_TYPES.join(", ")],
    ["Status", STATUSES.join(", ")],
    ["Equipment Category", EQUIPMENT_TYPES.join(", ")],
    ["Document Type", DOC_TYPES.join(", ")],
  ];
  return [
    { name: "Guide", rows: guide },
    ...IMPORT_ORDER.map((k) => ({
      name: k,
      rows: [SPECS[k].map((c) => (c.required ? `${c.header} *` : c.header))],
    })),
  ];
}
