import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CampusFilter } from "@/components/CampusFilter";
import { DashboardToolbar } from "@/components/DashboardToolbar";
import { DashboardSection } from "@/components/DashboardSection";
import { VitalSignsSection } from "@/components/VitalSignsSection";
import { SfdcDashboardHeader } from "@/components/sfdc/SfdcDashboardHeader";
import { SfdcRefreshButton } from "@/components/sfdc/SfdcRefreshButton";
import { createClient } from "@/lib/supabase/server";
import type { CompareMode } from "@/lib/comparison";
import { getCampuses, getUserProfile } from "@/lib/metrics";
import {
  allowedSections,
  canViewMonthlyExpenses,
  canViewOperations,
  canViewVolunteerMatrix,
  allowedCampusesForScope,
  campusScope,
  isAdmin,
  resolveSectionForProfile,
} from "@/lib/permissions";
import {
  isVitalSignsSection,
  parseViewSection,
  VIEW_SECTION_DESCRIPTIONS,
  VIEW_SECTION_LABELS,
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
  const scope = campusScope(profile);
  const allowedCampuses = allowedCampusesForScope(scope, campuses);
  if (!scope.churchWide && allowedCampuses.length === 0) {
    throw new Error("No campus access configured for this user");
  }

  const requestedCampusId =
    params.campus && params.campus !== "all" ? params.campus : null;
  const requestedCampusAllowed = requestedCampusId
    ? allowedCampuses.some((campus) => campus.id === requestedCampusId)
    : scope.churchWide;
  const campusId = requestedCampusAllowed
    ? requestedCampusId
    : scope.churchWide
      ? null
      : allowedCampuses[0].id;

  const allowedCompareModes: CompareMode[] = [
    "off",
    ...(scope.full ? (["cross-campus"] as const) : []),
    ...(scope.churchWide && allowedCampuses.length > 0
      ? (["vs-church"] as const)
      : []),
  ];
  const requestedCompare = (params.compare ?? "off") as CompareMode;
  const compareMode: CompareMode = allowedCompareModes.includes(
    requestedCompare
  )
    ? requestedCompare
    : "off";
  const visibleCampusIds = scope.full
    ? null
    : allowedCampuses.map((campus) => campus.id);
  const visibleSections = allowedSections(profile);
  const section = resolveSectionForProfile(profile, params.section);
  const canViewFinancial = canViewOperations(profile);

  if (visibleSections.length === 0) {
    if (canViewVolunteerMatrix(profile)) redirect("/volunteer-matrix");
    if (canViewMonthlyExpenses(profile)) redirect("/monthly-expenses");
    redirect("/login");
  }

  const sectionMismatch =
    params.section != null &&
    parseViewSection(params.section, section) !== section;
  const campusMismatch =
    (params.campus ?? null) !== campusId ||
    (params.compare ?? "off") !== compareMode;

  if (sectionMismatch || campusMismatch) {
    const redirectParams = new URLSearchParams();
    redirectParams.set("section", section);
    if (campusId) redirectParams.set("campus", campusId);
    if (compareMode !== "off") redirectParams.set("compare", compareMode);
    redirect(`/dashboard?${redirectParams.toString()}`);
  }

  return (
    <>
      <Navbar profile={profile} />

      <main className="sfdc-page space-y-4">
        <SfdcDashboardHeader
          breadcrumb="Dashboard"
          title={VIEW_SECTION_LABELS[section]}
          description={VIEW_SECTION_DESCRIPTIONS[section]}
          actions={
            <>
              <Suspense fallback={null}>
                <CampusFilter
                  campuses={allowedCampuses}
                  allowAllCampuses={scope.churchWide}
                />
              </Suspense>
              <SfdcRefreshButton />
            </>
          }
        />

        <DashboardToolbar
          allowedSections={visibleSections}
          compareModes={allowedCompareModes}
        />

        {isVitalSignsSection(section) ? (
          <VitalSignsSection
            campusId={campusId}
            visibleCampusIds={visibleCampusIds}
            allowBenchmarkEdit={isAdmin(profile)}
          />
        ) : (
          <DashboardSection
            section={section}
            campusId={campusId}
            compareMode={compareMode}
            campuses={allowedCampuses}
            canViewFinancial={canViewFinancial}
            fullCampusAccess={scope.full}
            churchWideAccess={scope.churchWide}
            allowBenchmarkEdit={isAdmin(profile)}
          />
        )}
      </main>
    </>
  );
}
