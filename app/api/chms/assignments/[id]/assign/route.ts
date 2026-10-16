import { NextResponse } from "next/server";
import { assignManager } from "@/lib/chms/actions";
import { canManageChmsProcesses } from "@/lib/chms/permissions";
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

  if (!profile || !canManageChmsProcesses(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const managerId = body.managerId as string | undefined;
  if (!managerId) {
    return NextResponse.json({ error: "managerId required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    await assignManager(admin, id, managerId, profile.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Assign failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
