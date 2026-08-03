import { getStoredToken } from "@/lib/auth";
import type { Equipment, Vehicle } from "@/types/asset";

async function authedFetch<T>(path: string): Promise<T> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("You're not signed in.");
  }

  const res = await fetch(path, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (data && (data.message ?? data.error)) ??
      `Request failed (${res.status}).`;
    throw new Error(message);
  }

  return data as T;
}

export function getEquipment(): Promise<Equipment[]> {
  return authedFetch<Equipment[]>("/api/equipment");
}

export function getVehicles(): Promise<Vehicle[]> {
  return authedFetch<Vehicle[]>("/api/vehicles");
}