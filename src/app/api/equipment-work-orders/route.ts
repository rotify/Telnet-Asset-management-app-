import { NextResponse } from "next/server";

// The work-orders service runs on a separate server from the main
// backend (and over plain http), so the browser can't call it directly
// from the https site. This route calls it server-side instead.
const WORK_ORDERS_API_URL =
  process.env.WORK_ORDERS_API_URL ?? "http://207.180.246.69:7038/api";

async function fetchOrders(token: string) {
  return fetch(`${WORK_ORDERS_API_URL}/equipment-work-orders/`, {
    headers: { Authorization: `Token ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
}

// The work-orders server issues its own admin token. If the signed-in
// user's token isn't accepted there, optionally fall back to a service
// account configured in server-side env vars (never exposed to the
// browser): WORK_ORDERS_USERNAME / WORK_ORDERS_PASSWORD.
async function getServiceToken(): Promise<string | null> {
  const username = process.env.WORK_ORDERS_USERNAME;
  const password = process.env.WORK_ORDERS_PASSWORD;
  if (!username || !password) return null;
  const res = await fetch(`${WORK_ORDERS_API_URL}/get-token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.token ?? null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { message: "Missing Authorization header." },
      { status: 401 }
    );
  }

  try {
    const userToken = authHeader.replace(/^Token\s+/i, "");
    let upstream = await fetchOrders(userToken);

    if (upstream.status === 401 || upstream.status === 403) {
      const serviceToken = await getServiceToken();
      if (serviceToken) upstream = await fetchOrders(serviceToken);
    }

    const data = await upstream.json().catch(() => []);
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { message: "Couldn't reach the work orders service." },
      { status: 502 }
    );
  }
}
