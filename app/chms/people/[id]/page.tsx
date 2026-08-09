import Link from "next/link";
import { requireChmsAccess } from "@/lib/chms/server-auth";
import { getChmsPerson } from "@/lib/chms/data";
import { ministryAreaLabel } from "@/lib/chms/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getPersonAssignments(supabase: SupabaseClient, personId: string) {
  const { data } = await supabase
    .from("chms_assignments")
    .select("*, queue:chms_queues(name, process:chms_processes(name))")
    .eq("person_id", personId)
    .order("entered_at", { ascending: false });
  return data ?? [];
}

type PersonDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function ChmsPersonDetailPage({ params }: PersonDetailProps) {
  const { id } = await params;
  const { supabase } = await requireChmsAccess();
  const person = await getChmsPerson(supabase, id);

  if (!person) {
    return <div className="alert alert-warning">Person not found.</div>;
  }

  const assignments = await getPersonAssignments(supabase, id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {person.first_name} {person.last_name}
        </h2>
        <p className="text-sm text-base-content/60">
          {person.campus?.name ?? "No campus"} · Added{" "}
          {new Date(person.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body text-sm gap-2">
          {person.email && (
            <p>
              Email:{" "}
              <a className="link" href={`mailto:${person.email}`}>
                {person.email}
              </a>
            </p>
          )}
          {person.phone && (
            <p>
              Phone:{" "}
              <a className="link" href={`tel:${person.phone}`}>
                {person.phone}
              </a>
            </p>
          )}
          <p>Source: {person.source}</p>
          {person.is_first_time_guest && (
            <p className="badge badge-outline w-fit">First-time guest</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Process history</h3>
        <ul className="space-y-2">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-base-300 p-3 text-sm"
            >
              <Link href={`/chms/queues/${a.queue_id}`} className="link font-medium">
                {a.queue?.name}
              </Link>
              <span className="text-base-content/50">
                {" "}
                · {a.queue?.process?.name} · {a.status}
                {a.ministry_area
                  ? ` · ${ministryAreaLabel(a.ministry_area)}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
        {assignments.length === 0 && (
          <p className="text-sm text-base-content/60">No queue history.</p>
        )}
      </div>
    </div>
  );
}
