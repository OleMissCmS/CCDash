import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChmsAssignment,
  ChmsAssignmentNote,
  ChmsPerson,
  ChmsProcessWithQueues,
  ChmsQueue,
  ChmsQueueTransition,
} from "./types";

const ASSIGNMENT_SELECT = `
  *,
  person:chms_people(*, campus:campuses(*)),
  queue:chms_queues(*, process:chms_processes(*)),
  campus:campuses(*)
`;

export async function getChmsProcesses(
  supabase: SupabaseClient
): Promise<ChmsProcessWithQueues[]> {
  const { data: processes } = await supabase
    .from("chms_processes")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const { data: queues } = await supabase
    .from("chms_queues")
    .select("*")
    .order("sort_order");

  const { data: assignments } = await supabase
    .from("chms_assignments")
    .select("id, queue_id, status, assigned_to")
    .neq("status", "done");

  const queueStats = new Map<
    string,
    { open: number; unassigned: number }
  >();

  for (const row of assignments ?? []) {
    const stats = queueStats.get(row.queue_id) ?? { open: 0, unassigned: 0 };
    stats.open += 1;
    if (!row.assigned_to) stats.unassigned += 1;
    queueStats.set(row.queue_id, stats);
  }

  return (processes ?? []).map((process) => ({
    ...process,
    queues: (queues ?? [])
      .filter((q) => q.process_id === process.id)
      .map((q) => ({
        ...q,
        open_count: queueStats.get(q.id)?.open ?? 0,
        unassigned_count: queueStats.get(q.id)?.unassigned ?? 0,
      })),
  }));
}

export async function getChmsQueues(
  supabase: SupabaseClient,
  campusId?: string | null
): Promise<
  Array<
    ChmsQueue & {
      process: { name: string; slug: string };
      open_count: number;
      unassigned_count: number;
    }
  >
> {
  const { data: queues } = await supabase
    .from("chms_queues")
    .select("*, process:chms_processes(name, slug)")
    .order("sort_order");

  let assignmentQuery = supabase
    .from("chms_assignments")
    .select("id, queue_id, status, assigned_to, campus_id")
    .neq("status", "done");

  if (campusId) assignmentQuery = assignmentQuery.eq("campus_id", campusId);

  const { data: assignments } = await assignmentQuery;

  const queueStats = new Map<
    string,
    { open: number; unassigned: number }
  >();

  for (const row of assignments ?? []) {
    const stats = queueStats.get(row.queue_id) ?? { open: 0, unassigned: 0 };
    stats.open += 1;
    if (!row.assigned_to) stats.unassigned += 1;
    queueStats.set(row.queue_id, stats);
  }

  return (queues ?? []).map((q) => ({
    ...q,
    open_count: queueStats.get(q.id)?.open ?? 0,
    unassigned_count: queueStats.get(q.id)?.unassigned ?? 0,
  }));
}

export async function getChmsQueue(
  supabase: SupabaseClient,
  queueId: string
): Promise<ChmsQueue | null> {
  const { data } = await supabase
    .from("chms_queues")
    .select("*, process:chms_processes(*)")
    .eq("id", queueId)
    .maybeSingle();
  return data;
}

export async function getQueueAssignments(
  supabase: SupabaseClient,
  queueId: string,
  options?: { campusId?: string | null; activeOnly?: boolean }
): Promise<ChmsAssignment[]> {
  let query = supabase
    .from("chms_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("queue_id", queueId)
    .order("entered_at", { ascending: false });

  if (options?.activeOnly !== false) {
    query = query.neq("status", "done");
  }
  if (options?.campusId) query = query.eq("campus_id", options.campusId);

  const { data } = await query;
  return (data ?? []) as ChmsAssignment[];
}

export async function getMyAssignments(
  supabase: SupabaseClient,
  userId: string,
  campusId?: string | null
): Promise<ChmsAssignment[]> {
  let query = supabase
    .from("chms_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("assigned_to", userId)
    .neq("status", "done")
    .order("due_at", { ascending: true, nullsFirst: false });

  if (campusId) query = query.eq("campus_id", campusId);

  const { data } = await query;
  return (data ?? []) as ChmsAssignment[];
}

export async function getAllAssignments(
  supabase: SupabaseClient,
  campusId?: string | null
): Promise<ChmsAssignment[]> {
  let query = supabase
    .from("chms_assignments")
    .select(ASSIGNMENT_SELECT)
    .neq("status", "done")
    .order("entered_at", { ascending: false });

  if (campusId) query = query.eq("campus_id", campusId);

  const { data } = await query;
  return (data ?? []) as ChmsAssignment[];
}

export async function getAssignment(
  supabase: SupabaseClient,
  assignmentId: string
): Promise<ChmsAssignment | null> {
  const { data } = await supabase
    .from("chms_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("id", assignmentId)
    .maybeSingle();
  return data as ChmsAssignment | null;
}

export async function getAssignmentNotes(
  supabase: SupabaseClient,
  assignmentId: string
): Promise<ChmsAssignmentNote[]> {
  const { data } = await supabase
    .from("chms_assignment_notes")
    .select("*, author:user_profiles(display_name)")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ChmsAssignmentNote[];
}

export async function getQueueTransitions(
  supabase: SupabaseClient,
  fromQueueId: string
): Promise<ChmsQueueTransition[]> {
  const { data } = await supabase
    .from("chms_queue_transitions")
    .select("*, to_queue:chms_queues!chms_queue_transitions_to_queue_id_fkey(*)")
    .eq("from_queue_id", fromQueueId);
  return (data ?? []) as ChmsQueueTransition[];
}

export async function getChmsPeople(
  supabase: SupabaseClient,
  limit = 50
): Promise<ChmsPerson[]> {
  const { data } = await supabase
    .from("chms_people")
    .select("*, campus:campuses(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ChmsPerson[];
}

export async function getChmsPerson(
  supabase: SupabaseClient,
  personId: string
): Promise<ChmsPerson | null> {
  const { data } = await supabase
    .from("chms_people")
    .select("*, campus:campuses(*)")
    .eq("id", personId)
    .maybeSingle();
  return data as ChmsPerson | null;
}

export async function getStaffUsers(
  supabase: SupabaseClient
): Promise<Array<{ id: string; display_name: string | null }>> {
  const { data } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .order("display_name");
  return data ?? [];
}

export async function getChmsReports(supabase: SupabaseClient) {
  const { data: active } = await supabase
    .from("chms_assignments")
    .select("id, queue_id, assigned_to, status, entered_at, completed_at")
    .neq("status", "done");

  const { data: completed } = await supabase
    .from("chms_assignments")
    .select("id, queue_id, assigned_to, entered_at, completed_at")
    .eq("status", "done")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(200);

  const workload = new Map<string, number>();
  for (const row of active ?? []) {
    if (!row.assigned_to) continue;
    workload.set(row.assigned_to, (workload.get(row.assigned_to) ?? 0) + 1);
  }

  const durations: number[] = [];
  for (const row of completed ?? []) {
    if (!row.completed_at) continue;
    const ms =
      new Date(row.completed_at).getTime() -
      new Date(row.entered_at).getTime();
    durations.push(ms / (1000 * 60 * 60 * 24));
  }

  const avgDays =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;

  const { data: queues } = await supabase
    .from("chms_queues")
    .select("id, name");

  const funnel = (queues ?? []).map((q) => ({
    queueId: q.id,
    queueName: q.name,
    active: (active ?? []).filter((a) => a.queue_id === q.id).length,
    completed: (completed ?? []).filter((a) => a.queue_id === q.id).length,
  }));

  const { data: staff } = await supabase
    .from("user_profiles")
    .select("id, display_name");

  const workloadRows = [...workload.entries()].map(([userId, count]) => ({
    userId,
    name:
      staff?.find((s) => s.id === userId)?.display_name ?? "Staff",
    count,
  }));

  return { funnel, avgDays, workloadRows, activeCount: active?.length ?? 0 };
}
