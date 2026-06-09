import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CampusFilter } from "@/components/CampusFilter";
import { YearToggle } from "@/components/YearToggle";
import { DashboardToolbar } from "@/components/DashboardToolbar";
import { ConcernsPanel } from "@/components/ConcernsPanel";
import { DashboardSection } from "@/components/DashboardSection";
import { createClient } from "@/lib/supabase/server";
import type { CompareMode } from "@/lib/comparison";
import {
  buildBuiltInConcerns,
  evaluateAlertThresholds,
  getAnnualSnapshots,
  getCampuses,
  getUserProfile,
} from "@/lib/metrics";
import type { MetricCategory, YearMode } from "@/lib/types";

type DashboardPageProps = {
  searchParams: Promise<{
    campus?: string;
    section?: MetricCategory;
    year?: YearMode;
    compare?: CompareMode;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);

  if (!profile) redirect("/login");

  const campuses = await getCampuses(supabase);
  const campusId = params.campus ?? null;
  const section = (params.section ?? "attendance") as MetricCategory;
  const yearMode = (params.year ?? "fiscal") as YearMode;
  const compareMode = (params.compare ?? "off") as CompareMode;
  const canViewStewardship =
    profile.financial_insights || profile.role === "admin";

  if (section === "stewardship" && !canViewStewardship) {
    redirect("/dashboard?section=attendance");
  }

  const allSnapshots = await getAnnualSnapshots(supabase);
  const builtIn = buildBuiltInConcerns(allSnapshots, campuses);
  const thresholdConcerns = await evaluateAlertThresholds(
    supabase,
    allSnapshots
  );
  const concerns = [...builtIn, ...thresholdConcerns].slice(0, 3);

  return (
    <>
      <Navbar
        profile={profile}
        campusFilter={
          <Suspense fallback={null}>
            <CampusFilter campuses={campuses} />
          </Suspense>
        }
        yearToggle={
          <Suspense fallback={null}>
            <YearToggle />
          </Suspense>
        }
      />

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Ministry dashboard
          </h1>
          <p className="text-sm text-base-content/70">
            FY25/26 closeout vs FY26/27 targets · Community Church
          </p>
        </header>

        <ConcernsPanel concerns={concerns} />

        <DashboardToolbar canViewStewardship={canViewStewardship} />

        <DashboardSection
          category={section}
          campusId={campusId}
          yearMode={yearMode}
          compareMode={compareMode}
          campuses={campuses}
          canViewStewardship={canViewStewardship}
        />
      </main>
    </>
  );
}
