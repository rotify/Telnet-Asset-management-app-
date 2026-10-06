import { NextResponse } from "next/server";

// Base URL of the newer backend that hosts the work-orders and
// admin (users/roles/staff) endpoints. Plain http, so it is only ever
// called server-side from these proxy routes.
export const REMOTE_API_URL =
  process.env.REMOTE_API_URL ??
  process.env.WORK_ORDERS_API_URL ??
  "http://207.180.246.69:8038/api";

async function fetchRemote(url: string, token: string) {
  return fetch(url, {
    headers: { Authorization: `Token ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
}

// The remote server issues its own tokens. If the signed-in user's token
// isn't accepted there, optionally fall back to a service account kept in
// server-side env vars (never sent to the browser).
async function getServiceToken(): Promise<string | null> {
  const username =
    process.env.REMOTE_API_USERNAME ?? process.env.WORK_ORDERS_USERNAME;
  const password =
    process.env.REMOTE_API_PASSWORD ?? process.env.WORK_ORDERS_PASSWORD;
  if (!username || !password) return null;
  const res = await fetch(`${REMOTE_API_URL}/get-token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.token ?? null;
}

// GET-only proxy: forwards the path (and query string, e.g. page_size)
// to the remote API with the user's token, retrying once with the
// service-account token on 401/403.
export function remoteGetHandler(upstreamPath: string) {
  return async function handler(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { message: "Missing Authorization header." },
        { status: 401 }
      );
    }

    const search = new URL(request.url).search;
    const url = `${REMOTE_API_URL}${upstreamPath}${search}`;

    try {
      const userToken = authHeader.replace(/^Token\s+/i, "");
      let upstream = await fetchRemote(url, userToken);

      if (upstream.status === 401 || upstream.status === 403) {
        const serviceToken = await getServiceToken();
        if (serviceToken) upstream = await fetchRemote(url, serviceToken);
      }

      const data = await upstream.json().catch(() => ({}));
      return NextResponse.json(data, { status: upstream.status });
    } catch {
      return NextResponse.json(
        { message: "Couldn't reach the admin service." },
        { status: 502 }
      );
    }
  };
}
