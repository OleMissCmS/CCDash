import Link from "next/link";
import { requireChmsAccess } from "@/lib/chms/server-auth";

export default async function ChmsFormsPage() {
  await requireChmsAccess();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Forms</h2>
        <p className="text-sm text-base-content/60">
          Public forms that create people records and queue entries.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card bg-base-100 border border-warning/50 border-dashed">
          <div className="card-body gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Practice connect card</h3>
              <span className="badge badge-warning badge-outline badge-sm">
                Test
              </span>
            </div>
            <p className="text-sm text-base-content/70">
              Pre-filled fake guest for staff test runs. Same queue flow as the
              real form; records tagged for easy cleanup.
            </p>
            <Link
              href="/forms/practice"
              className="btn btn-warning btn-outline btn-sm w-fit"
            >
              Open practice form
            </Link>
            <p className="text-xs text-base-content/50">
              Link: <code>/forms/practice</code>
            </p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-3">
            <h3 className="font-semibold">Connect card</h3>
            <p className="text-sm text-base-content/70">
              First-time guests and interest areas. Submissions auto-create a
              person and add them to Guest Follow-Up.
            </p>
            <Link href="/forms/connect" className="btn btn-primary btn-sm w-fit">
              Open public form
            </Link>
            <p className="text-xs text-base-content/50">
              Share link: <code>/forms/connect</code>
            </p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-3">
            <h3 className="font-semibold">Prayer request</h3>
            <p className="text-sm text-base-content/70">
              Captures prayer needs. Creates a person record; pastoral queue
              routing comes in a later phase.
            </p>
            <Link href="/forms/prayer" className="btn btn-primary btn-sm w-fit">
              Open public form
            </Link>
            <p className="text-xs text-base-content/50">
              Share link: <code>/forms/prayer</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
