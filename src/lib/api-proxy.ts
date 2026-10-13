import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  "http://207.180.246.69:8038/api";

type ProxyMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";


export function proxyHandler(upstreamPath: string, method: ProxyMethod) {
  return async function handler(request: Request) {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "Missing Authorization header." },
        { status: 401 }
      );
    }

    const init: RequestInit = {
      method,
      headers: { Authorization: authHeader, Accept: "application/json" },
      cache: "no-store",
    };

    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const body = await request.json().catch(() => ({}));
      init.headers = {
        ...init.headers,
        "Content-Type": "application/json",
      };
      init.body = JSON.stringify(body);
    }

    const upstream = await fetch(`${API_BASE_URL}${upstreamPath}`, init);

    if (upstream.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstream.status });
  };
}

/**
 * Same as proxyHandler, but for routes with a dynamic [id] segment
 * (e.g. /notifications/deliveries/[id]/retry). The id is spliced into
 * the upstream path via the `{id}` placeholder.
 */
export function proxyHandlerWithId(
  upstreamPathTemplate: string,
  method: ProxyMethod
) {
  return async function handler(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "Missing Authorization header." },
        { status: 401 }
      );
    }

    const init: RequestInit = {
      method,
      headers: { Authorization: authHeader, Accept: "application/json" },
      cache: "no-store",
    };

    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const body = await request.json().catch(() => ({}));
      init.headers = {
        ...init.headers,
        "Content-Type": "application/json",
      };
      init.body = JSON.stringify(body);
    }

    const upstreamPath = upstreamPathTemplate.replace("{id}", params.id);
    const upstream = await fetch(`${API_BASE_URL}${upstreamPath}`, init);

    if (upstream.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstream.status });
  };
}
