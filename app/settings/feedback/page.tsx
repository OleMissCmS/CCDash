import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/metrics";
import { isAdmin } from "@/lib/permissions";

type FeedbackRow = {
  id: string;
  display_name: string;
  kind: "issue" | "feedback";
  message: string;
  page_path: string;
  created_at: string;
};

const submittedAt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Detroit",
});

export default async function FeedbackSettingsPage() {
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);

  if (!profile) redirect("/login");
  if (!isAdmin(profile)) redirect("/dashboard");

  const { data } = await supabase
    .from("dashboard_feedback")
    .select("id, display_name, kind, message, page_path, created_at")
    .order("created_at", { ascending: false });

  const submissions = (data ?? []) as FeedbackRow[];

  return (
    <>
      <Navbar profile={profile} />
      <main className="mx-auto w-full max-w-3xl p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard feedback</h1>
            <p className="text-sm text-base-content/70">
              Issues and feedback submitted from the dashboard chat.
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            Back to dashboard
          </Link>
        </div>

        {submissions.length === 0 ? (
          <p className="text-sm text-base-content/60">No submissions yet.</p>
        ) : (
          <ul className="space-y-3">
            {submissions.map((row) => (
              <li
                key={row.id}
                className="card bg-base-100 border border-base-300 shadow-sm"
              >
                <div className="card-body gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      {row.display_name}
                      <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-base-content/60">
                        {row.kind === "issue" ? "Issue" : "Feedback"}
                      </span>
                    </p>
                    <time
                      className="text-xs text-base-content/60"
                      dateTime={row.created_at}
                    >
                      {submittedAt.format(new Date(row.created_at))}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{row.message}</p>
                  <p className="text-xs text-base-content/60">
                    Page: {row.page_path}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
