import { NextResponse } from "next/server";
import { completeAssignment } from "@/lib/chms/actions";
import { canAccessChms, canManageChmsProcesses } from "@/lib/chms/permissions";
import { getAssignment } from "@/lib/chms/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/metrics";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);

  if (!profile || !canAccessChms(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const assignment = await getAssignment(supabase, id);
  if (!assignment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canComplete =
    canManageChmsProcesses(profile) ||
    assignment.assigned_to === profile.id;

  if (!canComplete) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.note?.trim()) {
    return NextResponse.json({ error: "Completion note required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const result = await completeAssignment(
      admin,
      id,
      profile.id,
      body.note,
      body.nextQueueId
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Complete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
