import type { LoginPayload, LoginResponse } from "@/types/auth";

const TOKEN_KEY = "telnet_auth_token";
const USERNAME_KEY = "telnet_auth_username";


const SUPERADMIN_USERNAMES = ["olastickz"];

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message ?? "Invalid username or password.");
  }

  return data as LoginResponse;
}

export function storeSession(
  token: string,
  username: string,
  rememberMe: boolean
) {
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USERNAME_KEY, username);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem(TOKEN_KEY) ??
    window.sessionStorage.getItem(TOKEN_KEY)
  );
}

export function getStoredUsername(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem(USERNAME_KEY) ??
    window.sessionStorage.getItem(USERNAME_KEY)
  );
}

export function clearStoredSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USERNAME_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USERNAME_KEY);
}

export function isSuperAdmin(username: string | null): boolean {
  if (!username) return false;
  return SUPERADMIN_USERNAMES.includes(username.trim().toLowerCase());
}

export function postLoginRedirectPath(username: string): string {
  return isSuperAdmin(username) ? "/admin/dashboard" : "/dashboard";
}

export async function requestPasswordReset(username: string): Promise<void> {
  await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
}
