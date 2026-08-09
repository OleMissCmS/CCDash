import { NextResponse } from "next/server";
import { addAssignmentNote } from "@/lib/chms/actions";
import { canAccessChms } from "@/lib/chms/permissions";
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

  const body = await request.json();
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Note body required" }, { status: 400 });
  }

  try {
    await addAssignmentNote(
      supabase,
      id,
      profile.id,
      body.body,
      body.contactType
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
