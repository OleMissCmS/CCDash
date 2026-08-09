import Link from "next/link";
import { requireChmsAccess } from "@/lib/chms/server-auth";
import { getChmsQueues } from "@/lib/chms/data";

type QueuesPageProps = {
  searchParams: Promise<{ campus?: string }>;
};

export default async function ChmsQueuesPage({ searchParams }: QueuesPageProps) {
  const params = await searchParams;
  const { supabase } = await requireChmsAccess();
  const queues = await getChmsQueues(supabase, params.campus ?? null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Queues</h2>
        <p className="text-sm text-base-content/60">
          Individual steps across all processes.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Queue</th>
              <th>Process</th>
              <th className="text-right">Active</th>
              <th className="text-right">Unassigned</th>
            </tr>
          </thead>
          <tbody>
            {queues.map((q) => (
              <tr key={q.id} className="hover">
                <td>
                  <Link
                    href={`/chms/queues/${q.id}`}
                    className="link font-medium"
                  >
                    {q.name}
                  </Link>
                </td>
                <td className="text-base-content/70">{q.process.name}</td>
                <td className="text-right tabular-nums">{q.open_count}</td>
                <td className="text-right tabular-nums">
                  {q.unassigned_count > 0 ? (
                    <span className="text-warning">{q.unassigned_count}</span>
                  ) : (
                    "0"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
