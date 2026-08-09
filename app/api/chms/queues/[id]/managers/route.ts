import { NextResponse } from "next/server";
import { canManageChmsProcesses } from "@/lib/chms/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/metrics";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: queueId } = await params;
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);

  if (!profile || !canManageChmsProcesses(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const managerIds = Array.isArray(body.managerIds)
    ? (body.managerIds as string[])
    : [];

  try {
    const admin = createAdminClient();
    await admin.from("chms_queue_managers").delete().eq("queue_id", queueId);

    if (managerIds.length > 0) {
      const { error } = await admin.from("chms_queue_managers").insert(
        managerIds.map((userId) => ({
          queue_id: queueId,
          user_id: userId,
        }))
      );
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
