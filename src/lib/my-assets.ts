import {
  getCurrentUser,
  getDocuments,
  getEquipment,
  getProfileSettings,
  getStaff,
  getVehicles,
} from "@/lib/api";
import type { Equipment, Vehicle } from "@/types/asset";
import type { DocumentRecord } from "@/types/document";

// Staff must only ever see what is assigned to them. The backend should
// enforce this, but the app also filters client-side so a staff login never
// displays someone else's records even if the API returns more.

export interface MyData {
  vehicles: Vehicle[];
  equipment: Equipment[];
  documents: DocumentRecord[];
  errors: string[];
  documentsAvailable: boolean; // false when the backend denies staff access
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
    withTimeout(getCurrentUser())
      .then((u) => (u.role ?? "").toLowerCase())
      .catch(() => ""),
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
  return { names, staffId, isDriver: role === "driver" || driverStaff };
}

export async function loadMyData(): Promise<MyData> {
  const errors: string[] = [];
  let identity: Awaited<ReturnType<typeof getIdentity>> | null = null;
  try {
    identity = await getIdentity();
  } catch {
    errors.push("profile");
  }

  const [v, e, d] = await Promise.allSettled([
    withTimeout(getVehicles()),
    withTimeout(getEquipment()),
    withTimeout(getDocuments()),
  ]);
  const vehicles = v.status === "fulfilled" ? v.value : [];
  const equipment = e.status === "fulfilled" ? e.value : [];
  const documents = d.status === "fulfilled" ? d.value : [];
  if (v.status === "rejected") errors.push("vehicles");
  if (e.status === "rejected") errors.push("equipment");
  // Documents are manager/admin only on the backend, so a denial for a staff
  // login is expected, not an error.
  const documentsAvailable = d.status === "fulfilled";

  if (!identity || identity.names.size === 0) {
    return {
      vehicles: [],
      equipment: [],
      documents: [],
      errors,
      documentsAvailable,
      isDriver: false,
      linked: false,
    };
  }
  const { names, staffId } = identity;
  // Only drivers see vehicles (also covers anyone who has one assigned).
  const isMine = (assigned: string | null | undefined) =>
    names.has(norm(assigned));

  const assignedVehicles = vehicles.filter((x) => isMine(x.assigned_staff));
  const isDriver = identity.isDriver || assignedVehicles.length > 0;
  const myVehicles = isDriver ? assignedVehicles : [];
  const myEquipment = equipment.filter(
    (x) => isMine(x.assigned_staff) || isMine(x.assigned_user)
  );
  const vehicleIds = new Set(myVehicles.map((x) => x.id));
  const equipmentIds = new Set(myEquipment.map((x) => x.id));
  const myDocuments = documents.filter(
    (x) =>
      (staffId !== null && x.responsible_staff === staffId) ||
      isMine(x.responsible_person) ||
      (x.related_vehicle !== null && vehicleIds.has(x.related_vehicle)) ||
      (x.related_equipment !== null && equipmentIds.has(x.related_equipment))
  );

  return {
    vehicles: myVehicles,
    equipment: myEquipment,
    documents: myDocuments,
    errors,
    documentsAvailable,
    isDriver,
    linked: true,
  };
}
