import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { syncAttendanceFromGoogleSheets } from "@/lib/sync-attendance";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAttendanceFromGoogleSheets();
    return NextResponse.json({ ok: true, ...result });
  } catch (syncError) {
    const message =
      syncError instanceof Error ? syncError.message : "Attendance sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
