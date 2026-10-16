import { AssignmentCard } from "@/components/chms/AssignmentCard";
import { requireChmsAccess } from "@/lib/chms/server-auth";
import {
  getAssignmentNotes,
  getMyAssignments,
  getQueueTransitions,
  getStaffUsers,
} from "@/lib/chms/data";
import { canManageChmsProcesses } from "@/lib/chms/permissions";
import { getCampuses } from "@/lib/metrics";

type ChmsHomeProps = {
  searchParams: Promise<{ campus?: string }>;
};

export default async function ChmsHomePage({ searchParams }: ChmsHomeProps) {
  const params = await searchParams;
  const { supabase, profile } = await requireChmsAccess();
  const campusId = params.campus ?? null;
  const canManage = canManageChmsProcesses(profile);

  const assignments = await getMyAssignments(supabase, profile.id, campusId);
  const staff = await getStaffUsers(supabase);
  const campuses = await getCampuses(supabase);

  const enriched = await Promise.all(
    assignments.map(async (a) => {
      const [notes, transitions] = await Promise.all([
        getAssignmentNotes(supabase, a.id),
        getQueueTransitions(supabase, a.queue_id),
      ]);
      return {
        assignment: a,
        notes,
        nextQueues: transitions.map((t) => ({
          id: t.to_queue_id,
          label: t.label ?? t.to_queue?.name ?? "Next step",
        })),
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">My assignments</h2>
        <p className="text-sm text-base-content/60">
          People assigned to you{campusId ? ` · ${campuses.find((c) => c.id === campusId)?.name}` : ""}
          . Overdue items should be handled first.
        </p>
      </div>

      {enriched.length === 0 ? (
        <div className="alert">
          <span>
            No active assignments on your plate.
            {canManage
              ? " Assign managers from the Assignments or Queues tab."
              : " Check back when a coordinator assigns someone to you."}
          </span>
        </div>
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
              nextQueues={row.nextQueues}
            />
          ))}
        </div>
      )}
    </div>
  );
}
