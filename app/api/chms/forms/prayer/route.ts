import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PrayerPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  campusId?: string;
  request?: string;
  keepPrivate?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PrayerPayload;

    if (!body.firstName?.trim() || !body.lastName?.trim() || !body.request?.trim()) {
      return NextResponse.json(
        { error: "Name and prayer request are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: person, error: personError } = await supabase
      .from("chms_people")
      .insert({
        first_name: body.firstName.trim(),
        last_name: body.lastName.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        campus_id: body.campusId || null,
        source: "prayer_form",
      })
      .select("id")
      .single();

    if (personError || !person) {
      return NextResponse.json(
        { error: personError?.message ?? "Failed to save" },
        { status: 500 }
      );
    }

    await supabase.from("chms_form_submissions").insert({
      form_type: "prayer",
      payload: body,
      person_id: person.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
