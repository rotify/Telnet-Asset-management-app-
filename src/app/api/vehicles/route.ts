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

  const upstream = await fetch(`${API_BASE_URL}/vehicles/`, {
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

  const body = await request.json().catch(() => ({}));

  const upstream = await fetch(`${API_BASE_URL}/vehicles/`, {
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