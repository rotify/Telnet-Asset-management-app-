import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  "http://207.180.246.69:8038/api";

export async function PUT(
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

  const body = await request.json().catch(() => ({}));

  const upstream = await fetch(`${API_BASE_URL}/equipment/${params.id}/`, {
    method: "PUT",
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

export async function DELETE(
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

  const upstream = await fetch(`${API_BASE_URL}/equipment/${params.id}/`, {
    method: "DELETE",
    headers: { Authorization: authHeader, Accept: "application/json" },
    cache: "no-store",
  });

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await upstream.json().catch(() => ({}));

  return NextResponse.json(data, { status: upstream.status });
}
