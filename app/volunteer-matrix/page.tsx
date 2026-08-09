import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppTopNav } from "@/components/AppTopNav";
import { Navbar } from "@/components/Navbar";
import { VolunteerMatrixNeedSummary } from "@/components/VolunteerMatrixNeedSummary";
import { VolunteerMatrixPageFilters } from "@/components/VolunteerMatrixCampusFilter";
import { VolunteerMatrixSection } from "@/components/VolunteerMatrixSection";
import { getCampuses, getUserProfile } from "@/lib/metrics";
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

  const campuses = await getCampuses(supabase);
  const campusSlug = resolveVolunteerMatrixCampusSlug(
    campuses,
    params.campus ?? null
  );
  const ministryAreaSlug = resolveVolunteerMatrixMinistryAreaSlug(
    params.ministry ?? null
  );
  const data = await getVolunteerMatrixView(campusSlug, ministryAreaSlug);

  return (
    <>
      <Navbar profile={profile} />

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8 space-y-8">
        <header className="space-y-4">
          <AppTopNav />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Campus volunteer matrix
              </h1>
              <p className="text-sm text-base-content/70">
                Pool filled and staffing need vs current count · from Google
                Sheets
              </p>
            </div>
            <Suspense fallback={null}>
              <VolunteerMatrixPageFilters />
            </Suspense>
          </div>
        </header>

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
