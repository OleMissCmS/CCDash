import type { SupabaseClient } from "@supabase/supabase-js";
import { addBusinessDays } from "./constants";
import {
  notifyAssignedManager,
  notifyQueueManagersNewPerson,
} from "./notifications";

export async function getGuestEntryQueueId(
  supabase: SupabaseClient
): Promise<string> {
  const { data: process } = await supabase
    .from("chms_processes")
    .select("id")
    .eq("slug", "guest-follow-up")
    .single();

  if (!process) throw new Error("Guest follow-up process not found");

  const { data: queue } = await supabase
    .from("chms_queues")
    .select("id")
    .eq("process_id", process.id)
    .eq("slug", "48-hour-contact")
    .single();

  if (!queue?.id) throw new Error("Guest follow-up entry queue not found");
  return queue.id;
}

export async function createPersonAndAssignment(
  supabase: SupabaseClient,
  input: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    campusId?: string | null;
    ministryArea?: string | null;
    isFirstTimeGuest?: boolean;
    source: string;
    queueId: string;
    formSubmissionId?: string;
  }
) {
  const { data: person, error: personError } = await supabase
    .from("chms_people")
    .insert({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      campus_id: input.campusId ?? null,
      is_first_time_guest: input.isFirstTimeGuest ?? false,
      source: input.source,
    })
    .select("*")
    .single();

  if (personError || !person) {
    throw new Error(personError?.message ?? "Failed to create person");
  }

  const { data: queue } = await supabase
    .from("chms_queues")
    .select("default_due_days, name")
    .eq("id", input.queueId)
    .single();

  const dueAt = addBusinessDays(new Date(), queue?.default_due_days ?? 3);

  const { data: assignment, error: assignError } = await supabase
    .from("chms_assignments")
    .insert({
      person_id: person.id,
      queue_id: input.queueId,
      ministry_area: input.ministryArea ?? null,
      campus_id: input.campusId ?? null,
      due_at: dueAt.toISOString(),
      status: "open",
    })
    .select("*")
    .single();

  if (assignError || !assignment) {
    throw new Error(assignError?.message ?? "Failed to create assignment");
  }

  if (input.formSubmissionId) {
    await supabase
      .from("chms_form_submissions")
      .update({
        person_id: person.id,
        assignment_id: assignment.id,
      })
      .eq("id", input.formSubmissionId);
  }

  const personName = `${person.first_name} ${person.last_name}`;
  await notifyQueueManagersNewPerson(
    supabase,
    input.queueId,
    personName,
    input.ministryArea ?? null,
    assignment.id
  );

  return { person, assignment };
}

export async function assignManager(
  supabase: SupabaseClient,
  assignmentId: string,
  managerId: string,
  actorId: string
) {
  const assignment = await supabase
    .from("chms_assignments")
    .select("*, person:chms_people(first_name, last_name), queue:chms_queues(name)")
    .eq("id", assignmentId)
    .single();

  if (!assignment.data) throw new Error("Assignment not found");

  const { error } = await supabase
    .from("chms_assignments")
    .update({
      assigned_to: managerId,
      status:
        assignment.data.status === "open" ? "in_progress" : assignment.data.status,
      started_at: assignment.data.started_at ?? new Date().toISOString(),
    })
    .eq("id", assignmentId);

  if (error) throw new Error(error.message);

  const person = assignment.data.person as {
    first_name: string;
    last_name: string;
  };
  const queue = assignment.data.queue as { name: string };
  await notifyAssignedManager(
    supabase,
    managerId,
    `${person.first_name} ${person.last_name}`,
    queue.name,
    assignmentId
  );
}

export async function addAssignmentNote(
  supabase: SupabaseClient,
  assignmentId: string,
  authorId: string,
  body: string,
  contactType?: string | null
) {
  const { error } = await supabase.from("chms_assignment_notes").insert({
    assignment_id: assignmentId,
    author_id: authorId,
    body: body.trim(),
    contact_type: contactType ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function completeAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
  actorId: string,
  note: string,
  nextQueueId?: string | null
) {
  const { data: current } = await supabase
    .from("chms_assignments")
    .select("*, queue:chms_queues(id, name, default_due_days)")
    .eq("id", assignmentId)
    .single();

  if (!current) throw new Error("Assignment not found");

  await addAssignmentNote(supabase, assignmentId, actorId, note, "note");

  const { error: doneError } = await supabase
    .from("chms_assignments")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      completed_by: actorId,
    })
    .eq("id", assignmentId);

  if (doneError) throw new Error(doneError.message);

  let targetQueueId = nextQueueId ?? null;

  if (!targetQueueId) {
    const { data: defaultTransition } = await supabase
      .from("chms_queue_transitions")
      .select("to_queue_id")
      .eq("from_queue_id", current.queue_id)
      .eq("is_default", true)
      .maybeSingle();
    targetQueueId = defaultTransition?.to_queue_id ?? null;
  }

  if (!targetQueueId) return { advanced: false };

  const queue = current.queue as { default_due_days: number };
  const dueAt = addBusinessDays(new Date(), queue.default_due_days ?? 3);

  const { data: nextAssignment, error: nextError } = await supabase
    .from("chms_assignments")
    .insert({
      person_id: current.person_id,
      queue_id: targetQueueId,
      ministry_area: current.ministry_area,
      campus_id: current.campus_id,
      due_at: dueAt.toISOString(),
      status: "open",
      previous_assignment_id: assignmentId,
    })
    .select("*")
    .single();

  if (nextError || !nextAssignment) {
    throw new Error(nextError?.message ?? "Failed to advance to next queue");
  }

  const { data: person } = await supabase
    .from("chms_people")
    .select("first_name, last_name")
    .eq("id", current.person_id)
    .single();

  if (person) {
    await notifyQueueManagersNewPerson(
      supabase,
      targetQueueId,
      `${person.first_name} ${person.last_name}`,
      current.ministry_area,
      nextAssignment.id
    );
  }

  return { advanced: true, nextAssignmentId: nextAssignment.id };
}

export async function updateAssignmentStatus(
  supabase: SupabaseClient,
  assignmentId: string,
  status: "open" | "in_progress" | "done"
) {
  const patch: Record<string, string | null> = { status };
  if (status === "in_progress") {
    patch.started_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("chms_assignments")
    .update(patch)
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);
}
