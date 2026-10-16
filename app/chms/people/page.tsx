import Link from "next/link";
import { requireChmsAccess } from "@/lib/chms/server-auth";
import { getChmsPeople } from "@/lib/chms/data";

export default async function ChmsPeoplePage() {
  const { supabase } = await requireChmsAccess();
  const people = await getChmsPeople(supabase, 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">People</h2>
        <p className="text-sm text-base-content/60">
          Records created from forms or manual entry.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Campus</th>
              <th>Contact</th>
              <th>Source</th>
              <th>Guest</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="hover">
                <td>
                  <Link
                    href={`/chms/people/${p.id}`}
                    className="link font-medium"
                  >
                    {p.first_name} {p.last_name}
                  </Link>
                </td>
                <td>{p.campus?.name ?? "—"}</td>
                <td className="text-sm">
                  {p.email ?? p.phone ?? "—"}
                </td>
                <td className="text-base-content/60">{p.source}</td>
                <td>{p.is_first_time_guest ? "Yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {people.length === 0 && (
        <div className="alert">
          No people yet. Share the connect card form to get started.
        </div>
      )}
    </div>
  );
}
