"use client";

import { useEffect, useState } from "react";
import { getAdminUsers } from "@/lib/api";
import type { Staff } from "@/types/staff";

// Every staff record carries a driver_status ("available" by default), so
// that field can't tell drivers apart. A driver is a staff member whose
// linked login has the "driver" role. Vehicles can only go to drivers.
export function isDriverStaff(s: Staff, driverUserIds: Set<number>): boolean {
  return s.user !== null && driverUserIds.has(s.user);
}

// Loads the ids of login users with the driver role. Returns null until
// loaded (or if the user list can't be read).
export function useDriverUserIds(enabled = true): Set<number> | null {
  const [ids, setIds] = useState<Set<number> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    getAdminUsers(200)
      .then((page) =>
        setIds(
          new Set(page.results.filter((u) => u.role === "driver").map((u) => u.id))
        )
      )
      .catch(() => setIds(new Set()));
  }, [enabled]);

  return ids;
}
