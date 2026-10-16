import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SfdcDashboardHeader } from "@/components/sfdc/SfdcDashboardHeader";
import { SfdcRefreshButton } from "@/components/sfdc/SfdcRefreshButton";
import { VolunteerMatrixNeedSummary } from "@/components/VolunteerMatrixNeedSummary";
import { VolunteerMatrixPageFilters } from "@/components/VolunteerMatrixCampusFilter";
import { VolunteerMatrixSection } from "@/components/VolunteerMatrixSection";
import { getCampuses, getUserProfile } from "@/lib/metrics";
import { campusScope, canViewVolunteerMatrix } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { resolveVolunteerMatrixMinistryAreaSlug } from "@/lib/volunteer-matrix-areas";
import {
  getVolunteerMatrixView,
  resolveVolunteerMatrixCampusSlug,
} from "@/lib/volunteer-matrix";

type VolunteerMatrixPageProps = {
  searchParams: Promise<{
    campus?: string;
    ministry?: string;
  }>;
};

export default async function VolunteerMatrixPage({
  searchParams,
}: VolunteerMatrixPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);

  if (!profile) redirect("/login");
  if (!canViewVolunteerMatrix(profile)) redirect("/dashboard");

  const campuses = await getCampuses(supabase);
  const scope = campusScope(profile);
  const allowedCampusSlugs = scope.full ? null : scope.campusSlugs;
  const requestedCampusSlug = resolveVolunteerMatrixCampusSlug(
    campuses,
    params.campus ?? null
  );
  const campusSlug =
    allowedCampusSlugs == null
      ? requestedCampusSlug
      : requestedCampusSlug && allowedCampusSlugs.includes(requestedCampusSlug)
        ? requestedCampusSlug
        : allowedCampusSlugs[0];
  const ministryAreaSlug = resolveVolunteerMatrixMinistryAreaSlug(
    params.ministry ?? null
  );
  const data = await getVolunteerMatrixView(campusSlug, ministryAreaSlug);

  return (
    <>
      <Navbar profile={profile} />

      <main className="sfdc-page space-y-4">
        <SfdcDashboardHeader
          breadcrumb="Volunteer Matrix"
          title="Campus volunteer matrix"
          description="Pool filled and staffing need vs current count from Google Sheets."
          actions={
            <>
              <Suspense fallback={null}>
                <VolunteerMatrixPageFilters
                  selectedCampusSlug={campusSlug}
                  allowedCampusSlugs={allowedCampusSlugs}
                />
              </Suspense>
              <SfdcRefreshButton />
            </>
          }
        />

        <VolunteerMatrixNeedSummary
          summaries={data.areaSummaries}
          campusSlug={data.campusSlug}
          campusLabel={data.campusLabel}
          activeMinistrySlug={data.ministryAreaSlug}
        />

        <VolunteerMatrixSection data={data} />
      </main>
    </>
  );
}
