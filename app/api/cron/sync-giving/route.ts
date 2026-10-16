import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { isMondayBeforeSecondTuesday } from "@/lib/cron-schedule";
import { syncGivingFromGoogleSheets } from "@/lib/sync-giving";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMondayBeforeSecondTuesday(new Date())) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Not the Monday before the second Tuesday",
    });
  }

  try {
    const result = await syncGivingFromGoogleSheets();
    return NextResponse.json({ ok: true, ...result });
  } catch (syncError) {
    const message =
      syncError instanceof Error ? syncError.message : "Giving sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
