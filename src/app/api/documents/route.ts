import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";


export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { message: "Missing Authorization header." },
      { status: 401 }
    );
  }

  const upstream = await fetch(`${API_BASE_URL}/documents/`, {
    headers: { Authorization: authHeader, Accept: "application/json" },
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => []);

  return NextResponse.json(data, { status: upstream.status });
}


export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { message: "Missing Authorization header." },
      { status: 401 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  // File uploads arrive as multipart/form-data — forward the form data
  // through untouched (including the file) instead of JSON-encoding it.
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const upstream = await fetch(`${API_BASE_URL}/documents/`, {
      method: "POST",
      headers: { Authorization: authHeader, Accept: "application/json" },
      body: formData,
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  }

  const body = await request.json().catch(() => ({}));

  const upstream = await fetch(`${API_BASE_URL}/documents/`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));

  return NextResponse.json(data, { status: upstream.status });
}
