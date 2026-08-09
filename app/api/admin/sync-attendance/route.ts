import { NextResponse } from "next/server";
import { requireUserManager } from "@/lib/admin-auth";
import { syncAttendanceFromGoogleSheets } from "@/lib/sync-attendance";

export async function POST(request: Request) {
  const { error } = await requireUserManager();
  if (error) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let years: number[] | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body?.years)) {
      years = body.years.filter((year: unknown) => typeof year === "number");
    }
  } catch {
    years = undefined;
  }

  try {
    const result = await syncAttendanceFromGoogleSheets(years);
    return NextResponse.json({ ok: true, ...result });
  } catch (syncError) {
    const message =
      syncError instanceof Error ? syncError.message : "Attendance sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
