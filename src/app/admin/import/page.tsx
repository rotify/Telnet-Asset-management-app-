"use client";

import { useRef, useState } from "react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  createAdminStaff,
  createDocument,
  createEquipment,
  createVehicle,
  getAdminUsers,
  getDocuments,
  getEquipment,
  getStaff,
  getVehicles,
  updateAdminUser,
} from "@/lib/api";
import { buildXlsx, readXlsx } from "@/lib/xlsx-lite";
import {
  IMPORT_ORDER,
  parseSheet,
  templateRows,
  type ImportKind,
  type ParsedRow,
} from "@/lib/import-spec";
import type { Staff } from "@/types/staff";

interface KindResult {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  problems: { row: number; message: string }[];
}

const emptyResult = (): KindResult => ({
  total: 0,
  created: 0,
  skipped: 0,
  failed: 0,
  problems: [],
});

function msg(err: unknown): string {
  return err instanceof Error ? err.message : "Request failed.";
}

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [fatal, setFatal] = useState<string | null>(null);
  const [results, setResults] = useState<Partial<Record<ImportKind, KindResult>> | null>(null);

  function downloadTemplate() {
    const blob = buildXlsx(templateRows());
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "telnet-import-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setFatal(null);
    setResults(null);
    setFileName(file.name);
    setRunning(true);
    try {
      setProgress("Reading file…");
      const sheets = await readXlsx(file);
      const byName = new Map(Object.entries(sheets).map(([k, v]) => [k.trim().toLowerCase(), v]));
      const parsed: Partial<Record<ImportKind, ParsedRow[]>> = {};
      for (const kind of IMPORT_ORDER) {
        const rows = byName.get(kind.toLowerCase());
        if (rows && rows.length > 1) parsed[kind] = parseSheet(kind, rows);
      }
      if (Object.keys(parsed).length === 0) {
        setFatal(
          "No data found. Use the template: sheets named Staff, Vehicles, Equipment or Documents, with a header row and data below it."
        );
        return;
      }

      const out: Partial<Record<ImportKind, KindResult>> = {};
      const staffById = new Map<string, Staff>();
      let driverUserIds = new Set<number>();
      const loadStaff = async () => {
        staffById.clear();
        (await getStaff()).forEach((s) => staffById.set(s.staff_id.toLowerCase(), s));
        try {
          const users = await getAdminUsers(500);
          driverUserIds = new Set(users.results.filter((u) => u.role === "driver").map((u) => u.id));
        } catch {
          driverUserIds = new Set();
        }
      };
      await loadStaff();

      // Run one kind row by row; `handler` returns "created" | "skipped" or throws.
      async function run(
        kind: ImportKind,
        handler: (v: Record<string, string>) => Promise<"created" | "skipped">
      ) {
        const rows = parsed[kind];
        if (!rows) return;
        const res = emptyResult();
        out[kind] = res;
        res.total = rows.length;
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          setProgress(`${kind}: ${i + 1} of ${rows.length}…`);
          if (r.errors.length) {
            res.failed++;
            res.problems.push({ row: r.rowNumber, message: r.errors.join("; ") });
            continue;
          }
          try {
            const status = await handler(r.values);
            if (status === "created") res.created++;
            else res.skipped++;
          } catch (err) {
            res.failed++;
            res.problems.push({ row: r.rowNumber, message: msg(err) });
          }
        }
        setResults({ ...out });
      }

      await run("Staff", async (v) => {
        if (staffById.has(v.staff_id.toLowerCase())) return "skipped";
        const created = await createAdminStaff({
          staff_id: v.staff_id,
          first_name: v.first_name,
          last_name: v.last_name,
          email: v.email,
          department: v.department || undefined,
          branch: v.branch || undefined,
          is_active: true,
        });
        if (v.role && v.role !== "staff" && typeof created?.user === "number") {
          try {
            await updateAdminUser(created.user, { role: v.role });
          } catch {
            throw new Error(`Created, but the role "${v.role}" couldn't be set`);
          }
        }
        return "created";
      });
      if (parsed.Staff) await loadStaff();

      const lookup = (id: string): Staff | null => staffById.get(id.toLowerCase()) ?? null;

      if (parsed.Vehicles) {
        const existing = new Set(
          (await getVehicles()).map((x) => (x.license_plate ?? "").toLowerCase()).filter(Boolean)
        );
        await run("Vehicles", async (v) => {
          if (v.license_plate && existing.has(v.license_plate.toLowerCase())) return "skipped";
          let assigned: number | null = null;
          if (v.assigned_to) {
            const s = lookup(v.assigned_to);
            if (!s) throw new Error(`No staff with Employee ID "${v.assigned_to}"`);
            if (!(s.user !== null && driverUserIds.has(s.user)))
              throw new Error(`${v.assigned_to} isn't a driver; vehicles can only go to drivers`);
            assigned = s.id;
          }
          await createVehicle({
            name: v.name,
            license_plate: v.license_plate,
            vin_number: v.vin_number,
            make: v.make,
            model: v.model,
            asset_type: v.asset_type,
            status: v.status,
            insurance_expiry: v.insurance_expiry,
            roadworthy_expiry: v.roadworthy_expiry,
            license_expiry: v.license_expiry,
            hackney_permit: v.hackney_permit,
            cost: v.cost,
            assigned_staff: assigned,
          });
          if (v.license_plate) existing.add(v.license_plate.toLowerCase());
          return "created";
        });
      }

      if (parsed.Equipment) {
        const existing = new Set(
          (await getEquipment()).map((x) => (x.serial_number ?? "").toLowerCase()).filter(Boolean)
        );
        await run("Equipment", async (v) => {
          if (v.serial_number && existing.has(v.serial_number.toLowerCase())) return "skipped";
          let assigned: number | null = null;
          if (v.assigned_to) {
            const s = lookup(v.assigned_to);
            if (!s) throw new Error(`No staff with Employee ID "${v.assigned_to}"`);
            assigned = s.id;
          }
          await createEquipment({
            name: v.name,
            equipment_type: v.equipment_type,
            serial_number: v.serial_number,
            manufacturer: v.manufacturer,
            model_number: v.model_number,
            status: v.status,
            purchase_date: v.purchase_date,
            cost: v.cost,
            supplier: v.supplier,
            warranty_expiry: v.warranty_expiry,
            service_interval_months: v.service_interval_months,
            next_service_date: v.next_service_date,
            assigned_staff: assigned,
            regional_office: v.regional_office,
            location: v.location,
            notes: v.notes,
          });
          if (v.serial_number) existing.add(v.serial_number.toLowerCase());
          return "created";
        });
      }

      if (parsed.Documents) {
        let existing = new Set<string>();
        try {
          existing = new Set(
            (await getDocuments())
              .map((d) => (d.document_number ?? "").toLowerCase())
              .filter(Boolean)
          );
        } catch {
          // documents may not be readable; import anyway
        }
        await run("Documents", async (v) => {
          if (v.document_number && existing.has(v.document_number.toLowerCase())) return "skipped";
          await createDocument({
            name: v.name,
            document_type: v.document_type,
            document_number: v.document_number,
            issuing_authority: v.issuing_authority,
            issue_date: v.issue_date,
            expiry_date: v.expiry_date,
            status: v.status,
            notify_days_before: v.notify_days_before ? Number(v.notify_days_before) : undefined,
            location: v.location,
            description: v.description,
          });
          if (v.document_number) existing.add(v.document_number.toLowerCase());
          return "created";
        });
      }
      setResults({ ...out });
    } catch (err) {
      setFatal(
        err instanceof Error && /valid \.xlsx/.test(err.message)
          ? err.message
          : `Import stopped: ${msg(err)}`
      );
    } finally {
      setRunning(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <AdminPageShell
      title="Import Data"
      description="Upload an Excel sheet to add staff, vehicles, equipment and documents in bulk."
    >
      <div className="mt-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
        <h2 className="text-sm font-semibold text-[#121B3B]">1. Get the template</h2>
        <p className="mt-1 text-sm text-slate-500">
          One sheet each for Staff, Vehicles, Equipment and Documents, plus a guide with the allowed
          values. Imports run in that order so assets can be linked to staff by Employee ID.
        </p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#121B3B] hover:bg-slate-50"
        >
          Download template (.xlsx)
        </button>

        <h2 className="mt-6 border-t border-slate-100 pt-5 text-sm font-semibold text-[#121B3B]">
          2. Upload the filled sheet
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          The import starts as soon as you choose the file. Rows that already exist (same Employee
          ID, plate, serial or document number) are skipped, so re-uploading is safe. New staff are
          emailed their login details.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          disabled={running}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="mt-3 block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-telnet-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
        />
        {fileName && <p className="mt-2 text-xs text-slate-400">{fileName}</p>}
        {running && <p className="mt-3 text-sm text-slate-600">{progress || "Working…"}</p>}
        {fatal && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fatal}
          </p>
        )}
      </div>

      {results && (
        <div className="mt-6 space-y-4">
          {IMPORT_ORDER.filter((k) => results[k]).map((k) => {
            const r = results[k]!;
            return (
              <div
                key={k}
                className="rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.06)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#121B3B]">{k}</h3>
                  <p className="text-sm text-slate-500">
                    {r.total} rows ·{" "}
                    <span className="font-semibold text-green-600">{r.created} added</span> ·{" "}
                    {r.skipped} skipped ·{" "}
                    <span className={r.failed ? "font-semibold text-red-600" : ""}>
                      {r.failed} failed
                    </span>
                  </p>
                </div>
                {r.problems.length > 0 && (
                  <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto text-sm">
                    {r.problems.map((p, i) => (
                      <li key={i} className="text-red-600">
                        <span className="font-semibold">Row {p.row}:</span> {p.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminPageShell>
  );
}
