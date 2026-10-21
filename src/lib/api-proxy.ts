import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";


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

    try {
      const upstream = await fetch(`${API_BASE_URL}${upstreamPath}`, {
        ...init,
        signal: AbortSignal.timeout(20000),
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
