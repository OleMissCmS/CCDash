import { AssignmentCard } from "@/components/chms/AssignmentCard";
import { QueueManagerPanel } from "@/components/chms/QueueManagerPanel";
import { requireChmsAccess } from "@/lib/chms/server-auth";
import {
  getAssignmentNotes,
  getChmsQueue,
  getQueueAssignments,
  getQueueTransitions,
  getStaffUsers,
} from "@/lib/chms/data";
import { canManageChmsProcesses } from "@/lib/chms/permissions";

type QueueDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campus?: string }>;
};

export default async function ChmsQueueDetailPage({
  params,
  searchParams,
}: QueueDetailProps) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, profile } = await requireChmsAccess();
  const canManage = canManageChmsProcesses(profile);

  const queue = await getChmsQueue(supabase, id);
  if (!queue) {
    return <div className="alert alert-warning">Queue not found.</div>;
  }

  const assignments = await getQueueAssignments(supabase, id, {
    campusId: query.campus ?? null,
  });
  const staff = await getStaffUsers(supabase);
  const { data: managerRows } = await supabase
    .from("chms_queue_managers")
    .select("user_id")
    .eq("queue_id", id);
  const managerIds = (managerRows ?? []).map((r) => r.user_id);
  const transitions = await getQueueTransitions(supabase, id);
  const nextQueues = transitions.map((t) => ({
    id: t.to_queue_id,
    label: t.label ?? t.to_queue?.name ?? "Next step",
  }));

  const enriched = await Promise.all(
    assignments.map(async (a) => ({
      assignment: a,
      notes: await getAssignmentNotes(supabase, a.id),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{queue.name}</h2>
        <p className="text-sm text-base-content/60">
          {queue.process?.name} · {assignments.length} active
        </p>
        {queue.instructions && (
          <p className="text-sm mt-2 rounded-lg bg-base-200/60 p-3">
            {queue.instructions}
          </p>
        )}
      </div>

      {canManage && (
        <QueueManagerPanel
          queueId={id}
          staff={staff}
          currentManagerIds={managerIds}
        />
      )}

      {enriched.length === 0 ? (
        <div className="alert">No one is currently in this queue.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {enriched.map((row) => (
            <AssignmentCard
              key={row.assignment.id}
              assignment={row.assignment}
              notes={row.notes}
              staff={staff}
              canManage={canManage}
              currentUserId={profile.id}
              nextQueues={nextQueues}
            />
          ))}
        </div>
      )}
    </div>
  );
}
