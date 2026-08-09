import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type NotifyParams = {
  supabase: SupabaseClient;
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  subject: string;
  body: string;
  relatedAssignmentId?: string | null;
};

export async function sendChmsEmail(
  params: NotifyParams
): Promise<{ sent: boolean; logId: string }> {
  const { data: logRow, error } = await params.supabase
    .from("chms_notification_log")
    .insert({
      recipient_user_id: params.recipientUserId ?? null,
      recipient_email: params.recipientEmail ?? null,
      subject: params.subject,
      body: params.body,
      channel: "email",
      status: "pending",
      related_assignment_id: params.relatedAssignmentId ?? null,
    })
    .select("id")
    .single();

  if (error || !logRow) {
    throw new Error(error?.message ?? "Failed to log notification");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CHMS_EMAIL_FROM ?? "noreply@communitychurch.org";

  if (!apiKey || !params.recipientEmail) {
    if (process.env.NODE_ENV === "development") {
      console.info("[ChMS email]", params.subject, "→", params.recipientEmail);
    }
    await params.supabase
      .from("chms_notification_log")
      .update({ status: "logged_dev" })
      .eq("id", logRow.id);
    return { sent: false, logId: logRow.id };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.recipientEmail],
      subject: params.subject,
      text: params.body,
    }),
  });

  await params.supabase
    .from("chms_notification_log")
    .update({ status: response.ok ? "sent" : "failed" })
    .eq("id", logRow.id);

  return { sent: response.ok, logId: logRow.id };
}

export async function notifyQueueManagersNewPerson(
  supabase: SupabaseClient,
  queueId: string,
  personName: string,
  ministryArea: string | null,
  assignmentId: string
) {
  const { data: managers } = await supabase
    .from("chms_queue_managers")
    .select("user_id, user:user_profiles(id, display_name)")
    .eq("queue_id", queueId);

  if (!managers?.length) return;

  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers();

  for (const manager of managers) {
    const authUser = authUsers?.users.find((u) => u.id === manager.user_id);
    const email = authUser?.email;
    if (!email) continue;

    await sendChmsEmail({
      supabase,
      recipientUserId: manager.user_id,
      recipientEmail: email,
      subject: `New person in your queue: ${personName}`,
      body: `${personName} was added to a queue you manage.${
        ministryArea ? ` Ministry area: ${ministryArea}.` : ""
      }\n\nLog in to ChMS to assign a manager and follow up.`,
      relatedAssignmentId: assignmentId,
    });
  }
}

export async function notifyAssignedManager(
  supabase: SupabaseClient,
  assignedTo: string,
  personName: string,
  queueName: string,
  assignmentId: string
) {
  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const authUser = authUsers?.users.find((u) => u.id === assignedTo);
  const email = authUser?.email;
  if (!email) return;

  await sendChmsEmail({
    supabase,
    recipientUserId: assignedTo,
    recipientEmail: email,
    subject: `Assigned to you: ${personName}`,
    body: `You have been assigned ${personName} in "${queueName}". Please follow up before the due date.`,
    relatedAssignmentId: assignmentId,
  });
}
