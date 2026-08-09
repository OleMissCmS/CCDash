import { NextResponse } from "next/server";
import { requireUserManager } from "@/lib/admin-auth";
import { syncGivingFromGoogleSheets } from "@/lib/sync-giving";

export async function POST() {
  const { error } = await requireUserManager();
  if (error) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
