import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppTopNav } from "@/components/AppTopNav";
import { Navbar } from "@/components/Navbar";
import { CampusFilter } from "@/components/CampusFilter";
import { DashboardToolbar } from "@/components/DashboardToolbar";
import { ConcernsPanel } from "@/components/ConcernsPanel";
import { DashboardSection } from "@/components/DashboardSection";
import { VitalSignsSection } from "@/components/VitalSignsSection";
import { createClient } from "@/lib/supabase/server";
import type { CompareMode } from "@/lib/comparison";
import {
  buildBuiltInConcerns,
  evaluateAlertThresholds,
  getAnnualSnapshots,
  getCampuses,
  getUserProfile,
} from "@/lib/metrics";
import {
  allowedSections,
  canViewOperations,
  resolveSectionForProfile,
} from "@/lib/permissions";
import {
  isVitalSignsSection,
  parseViewSection,
  type ViewSection,
} from "@/lib/sections";

type DashboardPageProps = {
  searchParams: Promise<{
    campus?: string;
    section?: ViewSection | string;
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
  const compareMode = (params.compare ?? "off") as CompareMode;
  const visibleSections = allowedSections(profile);
  const section = resolveSectionForProfile(profile, params.section);
  const canViewFinancial = canViewOperations(profile);

  if (visibleSections.length === 0) {
    redirect("/login");
  }

  if (params.section) {
    const requested = parseViewSection(params.section, section);
    if (requested !== section) {
      const redirectParams = new URLSearchParams();
      redirectParams.set("section", section);
      if (params.campus) redirectParams.set("campus", params.campus);
      if (params.compare) redirectParams.set("compare", params.compare);
      redirect(`/dashboard?${redirectParams.toString()}`);
    }
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
      />

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8 space-y-8">
        <header className="space-y-4">
          <AppTopNav />
          <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Ministry dashboard
          </h1>
          <p className="text-sm text-base-content/70">
            FY25/26 closeout vs FY26/27 targets · Community Church
          </p>
          </div>
        </header>

        <ConcernsPanel concerns={concerns} />

        <DashboardToolbar allowedSections={visibleSections} />

        {isVitalSignsSection(section) ? (
          <VitalSignsSection campusId={campusId} />
        ) : (
          <DashboardSection
            section={section}
            campusId={campusId}
            compareMode={compareMode}
            campuses={campuses}
            canViewFinancial={canViewFinancial}
          />
        )}
      </main>
    </>
  );
}
