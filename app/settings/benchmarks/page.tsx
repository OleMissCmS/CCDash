import Link from "next/link";
import { redirect } from "next/navigation";
import { BenchmarkForm } from "@/components/BenchmarkForm";
import { BenchmarkList } from "@/components/BenchmarkList";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import {
  getBenchmarkTargets,
  getCampuses,
  getMetrics,
  getUserProfile,
} from "@/lib/metrics";
import { canEditBenchmarks } from "@/lib/permissions";
import { TARGET_FISCAL_YEAR } from "@/lib/types";

export default async function BenchmarksSettingsPage() {
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);

  if (!profile) redirect("/login");
  if (!canEditBenchmarks(profile)) redirect("/dashboard");

  const [metrics, campuses, benchmarks] = await Promise.all([
    getMetrics(supabase),
    getCampuses(supabase),
    getBenchmarkTargets(supabase, TARGET_FISCAL_YEAR),
  ]);

  return (
    <>
      <Navbar profile={profile} />
      <main className="mx-auto w-full max-w-3xl p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Benchmarks</h1>
            <p className="text-sm text-base-content/70">
              Set comparison points for dashboard metrics. Stoplights: green =
              at/above benchmark, yellow = within 10%, red = more than 10%
              below.
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            Back to dashboard
          </Link>
        </div>

        <BenchmarkForm metrics={metrics} campuses={campuses} />

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">
              Active benchmarks ({TARGET_FISCAL_YEAR})
            </h2>
            <BenchmarkList
              benchmarks={benchmarks}
              metrics={metrics}
              campuses={campuses}
            />
          </div>
        </div>
      </main>
    </>
  );
}
