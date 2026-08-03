import { NextResponse } from "next/server";
import type { LoginPayload } from "@/types/auth";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  "https://company-assets-management-system.onrender.com/api";

export async function POST(request: Request) {
  const body = (await request.json()) as LoginPayload;

  if (!body.username || !body.password) {
    return NextResponse.json(
      { message: "Username and password are required." },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/get-token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: body.username,
        password: body.password,
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: "Could not reach the asset management service. Try again shortly." },
      { status: 502 }
    );
  }

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(
      { message: data.error ?? "Invalid username or password." },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ token: data.token }, { status: 200 });
}
