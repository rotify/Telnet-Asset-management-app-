import { NextResponse } from "next/server";

// Generic server-side proxy for the newer backend endpoints. The browser
// calls /api/remote/<path>; this forwards to <API_BASE_URL>/<path>/ with
// the user's token. The backend is plain http, so it can't be called
// straight from the https site. Only the prefixes below are allowed.
const API_BASE_URL =
  process.env.API_BASE_URL ?? "http://207.180.246.69:8038/api";

const ALLOWED_PREFIXES = [
  "me",
  "equipment-work-orders",
  "vehicle-maintenance",
  "equipment-transfers",
  "driver-requests",
  "bulk-upload-assets",
  "bulk-upload-equipment",
  "v1/admin/users",
  "v1/admin/staff",
  "v1/notifications/recipients",
  "asset",
  "vehicles",
  "equipment",
];

async function handle(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  if (!ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.json({ message: "Not allowed." }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { message: "Missing Authorization header." },
      { status: 401 }
    );
  }

  const search = new URL(request.url).search;
  const url = `${API_BASE_URL}/${path}/${search}`;

  const headers: Record<string, string> = {
    Authorization: authHeader,
    Accept: "application/json",
  };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const hasBody = !["GET", "HEAD", "DELETE"].includes(request.method);
  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
    if (upstream.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { message: "Couldn't reach the asset service." },
      { status: 502 }
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
