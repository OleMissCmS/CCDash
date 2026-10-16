import Link from "next/link";
import { requireChmsAccess } from "@/lib/chms/server-auth";
import { getAllAssignments, getStaffUsers } from "@/lib/chms/data";
import {
  ASSIGNMENT_STATUS_LABELS,
  ministryAreaLabel,
} from "@/lib/chms/constants";
import { canManageChmsProcesses } from "@/lib/chms/permissions";

type AssignmentsPageProps = {
  searchParams: Promise<{ campus?: string }>;
};

export default async function ChmsAssignmentsPage({
  searchParams,
}: AssignmentsPageProps) {
  const params = await searchParams;
  const { supabase, profile } = await requireChmsAccess();
  const canManage = canManageChmsProcesses(profile);
  const assignments = await getAllAssignments(supabase, params.campus ?? null);
  const staff = await getStaffUsers(supabase);
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s.display_name]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Assignments</h2>
        <p className="text-sm text-base-content/60">
          Everyone currently in a process queue.
          {canManage && " Admins assign managers from each queue detail page."}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Person</th>
              <th>Queue</th>
              <th>Campus</th>
              <th>Area</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const person = a.person!;
              const overdue =
                a.due_at && new Date(a.due_at) < new Date() && a.status !== "done";
              return (
                <tr key={a.id} className="hover">
                  <td>
                    <Link
                      href={`/chms/queues/${a.queue_id}`}
                      className="link font-medium"
                    >
                      {person.first_name} {person.last_name}
                    </Link>
                  </td>
                  <td>{a.queue?.name}</td>
                  <td>{a.campus?.name ?? "—"}</td>
                  <td>{ministryAreaLabel(a.ministry_area)}</td>
                  <td>
                    {a.assigned_to
                      ? staffById[a.assigned_to] ?? "Assigned"
                      : (
                          <span className="text-warning">Unassigned</span>
                        )}
                  </td>
                  <td>{ASSIGNMENT_STATUS_LABELS[a.status]}</td>
                  <td className={overdue ? "text-error tabular-nums" : "tabular-nums"}>
                    {a.due_at
                      ? new Date(a.due_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {assignments.length === 0 && (
        <div className="alert">No active assignments.</div>
      )}
    </div>
  );
}
