import {
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
  linked: boolean; // false when we couldn't tell who the user is
}

const norm = (s: string | null | undefined) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

async function getIdentity() {
  const profile = await getProfileSettings();
  const names = new Set<string>();
  const add = (v: string | null | undefined) => {
    const n = norm(v);
    if (n) names.add(n);
  };
  add(profile.username);
  add(`${profile.first_name} ${profile.last_name}`);
  add(`${profile.last_name} ${profile.first_name}`);

  let staffId: number | null = null;
  // The staff directory may be admin-only; ignore failures.
  const staff = await getStaff().catch(() => []);
  const me = staff.find(
    (s) =>
      s.user === profile.id ||
      (profile.email && norm(s.email) === norm(profile.email))
  );
  if (me) {
    staffId = me.id;
    add(`${me.first_name} ${me.last_name}`);
    add(`${me.last_name} ${me.first_name}`);
  }
  return { names, staffId };
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
    getVehicles(),
    getEquipment(),
    getDocuments(),
  ]);
  const vehicles = v.status === "fulfilled" ? v.value : [];
  const equipment = e.status === "fulfilled" ? e.value : [];
  const documents = d.status === "fulfilled" ? d.value : [];
  if (v.status === "rejected") errors.push("vehicles");
  if (e.status === "rejected") errors.push("equipment");
  if (d.status === "rejected") errors.push("documents");

  if (!identity || identity.names.size === 0) {
    return { vehicles: [], equipment: [], documents: [], errors, linked: false };
  }
  const { names, staffId } = identity;
  const isMine = (assigned: string | null | undefined) =>
    names.has(norm(assigned));

  const myVehicles = vehicles.filter((x) => isMine(x.assigned_staff));
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
    linked: true,
  };
}
