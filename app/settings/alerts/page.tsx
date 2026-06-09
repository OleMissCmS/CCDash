import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertForm } from "@/components/AlertForm";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import {
  getAlertThresholds,
  getCampuses,
  getMetrics,
  getUserProfile,
} from "@/lib/metrics";

export default async function AlertsSettingsPage() {
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);

  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const [metrics, campuses, thresholds] = await Promise.all([
    getMetrics(supabase),
    getCampuses(supabase),
    getAlertThresholds(supabase),
  ]);

  return (
    <>
      <Navbar profile={profile} />
      <main className="mx-auto w-full max-w-3xl p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Alert thresholds</h1>
            <p className="text-sm text-base-content/70">
              Administrators can set rules that surface on the dashboard
              concerns panel.
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            Back to dashboard
          </Link>
        </div>

        <AlertForm metrics={metrics} campuses={campuses} />

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Active thresholds</h2>
            {thresholds.length === 0 ? (
              <p className="text-sm text-base-content/60">
                No thresholds configured yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {thresholds.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-base-300 pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {t.label ?? t.metric?.label}
                      </p>
                      <p className="text-sm text-base-content/60">
                        {t.campus?.name ?? "Church-wide"} · threshold{" "}
                        {t.drop_percent}% over {t.months_window} months
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
