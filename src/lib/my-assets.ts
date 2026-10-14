import {
  getCurrentUser,
  getEquipment,
  getProfileSettings,
  getStaff,
  getVehicles,
} from "@/lib/api";
import type { Equipment, Vehicle } from "@/types/asset";

// Staff must only ever see what is assigned to them. The backend should
// enforce this, but the app also filters client-side so a staff login never
// displays someone else's records even if the API returns more.

export interface MyData {
  vehicles: Vehicle[];
  equipment: Equipment[];
  errors: string[];
  isDriver: boolean; // vehicles are only for drivers
  linked: boolean; // false when we couldn't tell who the user is
}

const norm = (s: string | null | undefined) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// Never let a slow or hanging request keep a screen on "Loading…".
function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timed out.")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function getIdentity() {
  const [profile, role, staff] = await Promise.all([
    withTimeout(getProfileSettings()),
    withTimeout(getCurrentUser()).catch(() => null),
    // The staff directory is admin-only; ignore failures for staff logins.
    withTimeout(getStaff()).catch(() => []),
  ]);
  const names = new Set<string>();
  const add = (v: string | null | undefined) => {
    const n = norm(v);
    if (n) names.add(n);
  };
  add(profile.username);
  add(`${profile.first_name} ${profile.last_name}`);
  add(`${profile.last_name} ${profile.first_name}`);

  let staffId: number | null = null;
  let driverStaff = false;
  const me = staff.find(
    (s) =>
      s.user === profile.id ||
      (profile.email && norm(s.email) === norm(profile.email))
  );
  if (me) {
    staffId = me.id;
    driverStaff = Boolean(me.driver_status?.trim());
    add(`${me.first_name} ${me.last_name}`);
    add(`${me.last_name} ${me.first_name}`);
  }
  // Staff logins can't read the staff directory, so use the id /me/ reports
  // if the backend provides one.
  if (staffId === null && typeof role?.staff_id === "number") {
    staffId = role.staff_id;
  }
  return {
    names,
    staffId,
    isDriver: (role?.role ?? "").toLowerCase() === "driver" || driverStaff,
  };
}

export async function loadMyData(): Promise<MyData> {
  const errors: string[] = [];
  let identity: Awaited<ReturnType<typeof getIdentity>> | null = null;
  try {
    identity = await getIdentity();
  } catch {
    errors.push("profile");
  }

  const [v, e] = await Promise.allSettled([
    withTimeout(getVehicles()),
    withTimeout(getEquipment()),
  ]);
  const vehicles = v.status === "fulfilled" ? v.value : [];
  const equipment = e.status === "fulfilled" ? e.value : [];
  if (v.status === "rejected") errors.push("vehicles");
  if (e.status === "rejected") errors.push("equipment");

  if (!identity || identity.names.size === 0) {
    return {
      vehicles: [],
      equipment: [],
      errors,
      isDriver: false,
      linked: false,
    };
  }
  const { names, staffId } = identity;
  // Only drivers see vehicles (also covers anyone who has one assigned).
  // assigned_staff may come back as a name or as a raw staff id.
  const isMine = (assigned: string | number | null | undefined) =>
    names.has(norm(String(assigned ?? ""))) ||
    (staffId !== null && assigned !== null && assigned !== undefined &&
      String(assigned) === String(staffId));

  const assignedVehicles = vehicles.filter((x) => isMine(x.assigned_staff));
  const isDriver = identity.isDriver || assignedVehicles.length > 0;
  const myVehicles = isDriver ? assignedVehicles : [];
  const myEquipment = equipment.filter(
    (x) => isMine(x.assigned_staff) || isMine(x.assigned_user)
  );
  return {
    vehicles: myVehicles,
    equipment: myEquipment,
    errors,
    isDriver,
    linked: true,
  };
}
