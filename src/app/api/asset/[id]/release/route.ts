import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";


export async function POST(
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

  const upstream = await fetch(
    `${API_BASE_URL}/asset/${params.id}/release/`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    }
  );

  const data = await upstream.json().catch(() => ({}));

  return NextResponse.json(data, { status: upstream.status });
}
