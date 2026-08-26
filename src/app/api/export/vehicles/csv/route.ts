import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  "https://company-assets-management-system.onrender.com/api";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { message: "Missing Authorization header." },
      { status: 401 }
    );
  }

  const upstream = await fetch(`${API_BASE_URL}/export/vehicles/csv/`, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  });

  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "text/csv" },
  });
}
