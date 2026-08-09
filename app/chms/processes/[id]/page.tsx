import Link from "next/link";
import { requireChmsAccess } from "@/lib/chms/server-auth";
import { getChmsProcesses } from "@/lib/chms/data";

type ProcessDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function ChmsProcessDetailPage({
  params,
}: ProcessDetailProps) {
  const { id } = await params;
  const { supabase } = await requireChmsAccess();
  const processes = await getChmsProcesses(supabase);
  const process = processes.find((p) => p.id === id);

  if (!process) {
    return <div className="alert alert-warning">Process not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{process.name}</h2>
        {process.description && (
          <p className="text-sm text-base-content/70">{process.description}</p>
        )}
      </div>

      <ol className="space-y-3">
        {process.queues.map((queue, index) => (
          <li key={queue.id}>
            <Link
              href={`/chms/queues/${queue.id}`}
              className="card bg-base-100 border border-base-300 shadow-sm hover:border-primary/40"
            >
              <div className="card-body py-4 flex-row items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{queue.name}</p>
                  {queue.description && (
                    <p className="text-sm text-base-content/60">
                      {queue.description}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p>{queue.open_count} active</p>
                  {queue.unassigned_count > 0 && (
                    <p className="text-warning">
                      {queue.unassigned_count} unassigned
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
