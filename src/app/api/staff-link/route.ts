import { NextResponse } from "next/server";
import {
  REMOTE_API_URL,
  fetchRemote,
  getServiceToken,
} from "@/lib/remote-proxy";

// Tells a signed-in staff member which staff record is theirs. The staff
// directory is admin-only, so this looks it up server-side with a service
// account (REMOTE_API_USERNAME / REMOTE_API_PASSWORD) and returns ONLY the
// caller's own staff id: never the directory.
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
    const meRes = await fetchRemote(`${REMOTE_API_URL}/me/`, userToken);
    if (!meRes.ok) {
      return NextResponse.json({ message: "Not signed in." }, { status: meRes.status });
    }
    const me = (await meRes.json().catch(() => null)) as {
      id?: number;
      staff_id?: number | null;
    } | null;
    if (typeof me?.staff_id === "number") {
      return NextResponse.json({ staff_id: me.staff_id });
    }
    if (typeof me?.id !== "number") {
      return NextResponse.json({ staff_id: null });
    }

    const serviceToken = await getServiceToken();
    if (!serviceToken) {
      return NextResponse.json(
        { message: "Staff lookup isn't configured." },
        { status: 503 }
      );
    }
    const staffRes = await fetchRemote(`${REMOTE_API_URL}/staff/`, serviceToken);
    const data = await staffRes.json().catch(() => null);
    const list: { id: number; user: number | null }[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
      ? data.results
      : [];
    const mine = list.find((s) => s.user === me.id);
    return NextResponse.json({ staff_id: mine ? mine.id : null });
  } catch {
    return NextResponse.json(
      { message: "Couldn't reach the asset service." },
      { status: 502 }
    );
  }
}
