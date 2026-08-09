import Link from "next/link";
import { requireChmsAccess } from "@/lib/chms/server-auth";
import { getChmsProcesses } from "@/lib/chms/data";

export default async function ChmsProcessesPage() {
  const { supabase } = await requireChmsAccess();
  const processes = await getChmsProcesses(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Processes</h2>
        <p className="text-sm text-base-content/60">
          Multi-step workflows your church uses to move people forward.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {processes.map((process) => (
          <Link
            key={process.id}
            href={`/chms/processes/${process.id}`}
            className="card bg-base-100 border border-base-300 shadow-sm hover:border-primary/40 transition-colors"
          >
            <div className="card-body">
              <h3 className="font-semibold">{process.name}</h3>
              {process.description && (
                <p className="text-sm text-base-content/70">
                  {process.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {process.queues.map((q) => (
                  <span key={q.id} className="badge badge-outline gap-1">
                    {q.name}
                    {q.open_count > 0 && (
                      <span className="badge badge-primary badge-xs">
                        {q.open_count}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
