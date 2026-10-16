import { requireChmsAccess } from "@/lib/chms/server-auth";
import { getChmsReports } from "@/lib/chms/data";

export default async function ChmsReportsPage() {
  const { supabase } = await requireChmsAccess();
  const { funnel, avgDays, workloadRows, activeCount } =
    await getChmsReports(supabase);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Reports</h2>
        <p className="text-sm text-base-content/60">
          Funnel, time-in-queue, and manager workload.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat bg-base-100 border border-base-300 rounded-lg">
          <div className="stat-title">Active assignments</div>
          <div className="stat-value text-2xl">{activeCount}</div>
        </div>
        <div className="stat bg-base-100 border border-base-300 rounded-lg">
          <div className="stat-title">Avg days to complete</div>
          <div className="stat-value text-2xl">
            {avgDays != null ? avgDays.toFixed(1) : "—"}
          </div>
        </div>
        <div className="stat bg-base-100 border border-base-300 rounded-lg">
          <div className="stat-title">Managers with load</div>
          <div className="stat-value text-2xl">{workloadRows.length}</div>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="font-semibold">Funnel by queue</h3>
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Queue</th>
                <th className="text-right">Active</th>
                <th className="text-right">Completed (recent)</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((row) => (
                <tr key={row.queueId}>
                  <td>{row.queueName}</td>
                  <td className="text-right tabular-nums">{row.active}</td>
                  <td className="text-right tabular-nums">{row.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Workload by manager</h3>
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Manager</th>
                <th className="text-right">Open assignments</th>
              </tr>
            </thead>
            <tbody>
              {workloadRows.map((row) => (
                <tr key={row.userId}>
                  <td>{row.name}</td>
                  <td className="text-right tabular-nums">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {workloadRows.length === 0 && (
          <p className="text-sm text-base-content/60">
            No assigned managers yet.
          </p>
        )}
      </section>
    </div>
  );
}
