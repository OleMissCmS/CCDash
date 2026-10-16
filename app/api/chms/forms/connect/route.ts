import { NextResponse } from "next/server";
import {
  createPersonAndAssignment,
  getGuestEntryQueueId,
} from "@/lib/chms/actions";
import { createAdminClient } from "@/lib/supabase/admin";

type ConnectPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  campusId?: string;
  ministryArea?: string;
  isFirstTimeGuest?: string;
  isPractice?: string;
  comments?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConnectPayload;

    if (!body.firstName?.trim() || !body.lastName?.trim()) {
      return NextResponse.json(
        { error: "First and last name are required" },
        { status: 400 }
      );
    }

    if (!body.campusId) {
      return NextResponse.json({ error: "Campus is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const isPractice = body.isPractice === "true";
    const isGuest = body.isFirstTimeGuest === "true";
    const source = isPractice ? "connect_form_practice" : "connect_form";
    const firstName = body.firstName.trim();
    const lastName = isPractice
      ? `${body.lastName.trim()} [Practice]`
      : body.lastName.trim();

    const { data: submission, error: subError } = await supabase
      .from("chms_form_submissions")
      .insert({
        form_type: isPractice ? "connect_practice" : "connect",
        payload: { ...body, firstName, lastName },
      })
      .select("id")
      .single();

    if (subError || !submission) {
      return NextResponse.json(
        { error: subError?.message ?? "Failed to save submission" },
        { status: 500 }
      );
    }

    if (isGuest) {
      const queueId = await getGuestEntryQueueId(supabase);
      await createPersonAndAssignment(supabase, {
        firstName,
        lastName,
        email: body.email,
        phone: body.phone,
        campusId: body.campusId,
        ministryArea: body.ministryArea || null,
        isFirstTimeGuest: true,
        source,
        queueId,
        formSubmissionId: submission.id,
      });
    } else {
      const { error: personError } = await supabase.from("chms_people").insert({
        first_name: firstName,
        last_name: lastName,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        campus_id: body.campusId,
        is_first_time_guest: false,
        source,
      });

      if (personError) {
        return NextResponse.json({ error: personError.message }, { status: 500 });
      }

      await supabase
        .from("chms_form_submissions")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", submission.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
