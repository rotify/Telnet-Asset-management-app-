"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assignDriverRequest,
  getAvailableVehicles,
  getDriverRequests,
  getStaff,
  reviewDriverRequest,
} from "@/lib/api";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { StatusDot } from "@/components/status-dot";
import { DataList } from "@/components/data-list";
import { MenuItem, ThreeDotMenu } from "@/components/three-dot-menu";
import { ViewToggleButton } from "@/components/view-toggle";
import { isDriverStaff, useDriverUserIds } from "@/lib/drivers";
import { DR_TONE, drLabel, fmtWhen, requestWindow } from "@/lib/driver-requests";
import type { Staff } from "@/types/staff";
import type { AvailableVehicle, DriverRequest } from "@/types/workflow";

const STATUSES = ["All", "requested", "approved", "assigned", "rejected"];

export default function DriverRequestsPage() {
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const driverIds = useDriverUserIds();

  const [assigning, setAssigning] = useState<DriverRequest | null>(null);
  const [vehicles, setVehicles] = useState<AvailableVehicle[]>([]);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getDriverRequests(), getStaff().catch(() => [] as Staff[])])
      .then(([r, s]) => {
        setRequests(r);
        setStaff(s);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Couldn't load requests.")
      )
      .finally(() => setIsLoading(false));
  }, []);

  const drivers = useMemo(
    () => (driverIds ? staff.filter((s) => isDriverStaff(s, driverIds)) : []),
    [staff, driverIds]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      return (
        !q ||
        `${r.details ?? ""} ${r.requested_by_name ?? ""} ${r.status} ${r.assigned_driver_name ?? ""}`
          .toLowerCase()
          .includes(q)
      );
    });
  }, [requests, search, statusFilter]);

  function patch(updated: DriverRequest) {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  }

  async function review(r: DriverRequest, action: "approve" | "reject") {
    let note: string | undefined;
    if (action === "reject") {
      const reason = window.prompt("Reason for rejecting (shown to the requester):");
      if (reason === null) return;
      note = reason.trim() || undefined;
    } else if (!window.confirm("Approve this driver request?")) {
      return;
    }
    setError(null);
    try {
      patch(await reviewDriverRequest(r.id, action, note));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the request.");
    }
  }

  async function openAssign(r: DriverRequest) {
    setAssigning(r);
    setDriverId("");
    setVehicleId("");
    setNotes("");
    setAssignError(null);
    try {
      setVehicles(await getAvailableVehicles());
    } catch (err) {
      setVehicles([]);
      setAssignError(err instanceof Error ? err.message : "Couldn't load vehicles.");
    }
  }

  async function confirmAssign() {
    if (!assigning) return;
    if (!driverId || !vehicleId) {
      setAssignError("Choose a driver and a vehicle.");
      return;
    }
    setSaving(true);
    setAssignError(null);
    try {
      patch(
        await assignDriverRequest(assigning.id, {
          assigned_driver: Number(driverId),
          assigned_vehicle: Number(vehicleId),
          notes: notes.trim() || undefined,
        })
      );
      setAssigning(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Couldn't assign.");
    } finally {
      setSaving(false);
    }
  }

  function actions(r: DriverRequest) {
    const canReview = r.status === "requested";
    const canAssign = r.status === "approved";
    if (!canReview && !canAssign) return <span className="text-xs text-slate-400">—</span>;
    return (
      <ThreeDotMenu>
        {(close) => (
          <div>
            {canReview && (
              <>
                <MenuItem onClick={() => { close(); review(r, "approve"); }}>Approve</MenuItem>
                <MenuItem tone="danger" onClick={() => { close(); review(r, "reject"); }}>
                  Reject
                </MenuItem>
              </>
            )}
            {canAssign && (
              <MenuItem onClick={() => { close(); openAssign(r); }}>Assign driver & vehicle</MenuItem>
            )}
          </div>
        )}
      </ThreeDotMenu>
    );
  }

  const select =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none";

  return (
    <AdminPageShell
      title="Driver Requests"
      description="Requests for a driver and vehicle: review, approve, then assign."
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search requests…"
      actions={
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-telnet-primary focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                Status: {s === "All" ? "All" : drLabel(s)}
              </option>
            ))}
          </select>
          <ViewToggleButton
            viewMode={viewMode}
            onToggle={() => setViewMode((m) => (m === "table" ? "card" : "table"))}
          />
        </div>
      }
    >
      {isLoading && <p className="mt-6 text-sm text-slate-500">Loading requests…</p>}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,64,0.06)]">
          No driver requests.
        </p>
      )}
      {filtered.length > 0 && (
        <DataList
          rows={filtered}
          rowKey={(r) => r.id}
          viewMode={viewMode}
          columns={[
            {
              header: "Requested by",
              cell: (r) => (
                <div>
                  <p className="font-semibold text-slate-800">{r.requested_by_name ?? "—"}</p>
                  <p className="text-xs text-slate-400">{fmtWhen(r.created_at)}</p>
                </div>
              ),
            },
            { header: "Details", cell: (r) => <span className="text-slate-600">{r.details || "—"}</span> },
            { header: "When", cell: (r) => <span className="text-slate-500">{requestWindow(r)}</span> },
            {
              header: "Status",
              cell: (r) => <StatusDot label={drLabel(r.status)} tone={DR_TONE[r.status] ?? "slate"} />,
            },
            {
              header: "Approval",
              cell: (r) => (
                <span className="text-xs text-slate-500">
                  {r.status === "rejected"
                    ? r.rejection_note || "Rejected"
                    : r.approved_at
                    ? `Approved ${fmtWhen(r.approved_at)}${r.requires_superadmin_approval ? " (admin)" : ""}`
                    : r.requires_superadmin_approval
                    ? "Needs admin approval"
                    : "Awaiting manager"}
                </span>
              ),
            },
            {
              header: "Assigned",
              cell: (r) => <span className="text-slate-500">{r.assigned_driver_name ?? "—"}</span>,
            },
            { header: "Actions", cell: (r) => actions(r) },
          ]}
          renderCard={(r) => (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{r.requested_by_name ?? "—"}</p>
                  <p className="text-xs text-slate-500">{requestWindow(r)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusDot label={drLabel(r.status)} tone={DR_TONE[r.status] ?? "slate"} />
                  {actions(r)}
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{r.details || "—"}</p>
            </div>
          )}
        />
      )}

      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#121B3B]">Assign driver & vehicle</h3>
            <p className="mt-1 text-sm text-slate-500">
              {assigning.requested_by_name}: {requestWindow(assigning)}
            </p>
            <div className="mt-4 space-y-3">
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={select}>
                <option value="">
                  {drivers.length ? "Select a driver" : "No drivers found"}
                </option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.first_name} {d.last_name} ({d.staff_id})
                  </option>
                ))}
              </select>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={select}>
                <option value="">
                  {vehicles.length ? "Select an available vehicle" : "No vehicles available"}
                </option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name || `${v.make ?? ""} ${v.model ?? ""}`.trim() || `Vehicle ${v.id}`}
                    {v.license_plate ? ` (${v.license_plate})` : ""}
                  </option>
                ))}
              </select>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className={select}
              />
            </div>
            {assignError && <p className="mt-3 text-sm text-red-600">{assignError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigning(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAssign}
                disabled={saving}
                className="rounded-lg bg-telnet-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
