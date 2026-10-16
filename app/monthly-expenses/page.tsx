import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { MonthlyExpensesCampusTabs } from "@/components/MonthlyExpensesCampusTabs";
import { MonthlyExpensesSection } from "@/components/MonthlyExpensesSection";
import { SfdcDashboardHeader } from "@/components/sfdc/SfdcDashboardHeader";
import { SfdcRefreshButton } from "@/components/sfdc/SfdcRefreshButton";
import { getUserProfile } from "@/lib/metrics";
import { getMonthlyExpensesView } from "@/lib/monthly-expenses";
import {
  allowedExpenseCampuses,
  canViewMonthlyExpenses,
  resolveExpenseCampusForProfile,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

type MonthlyExpensesPageProps = {
  searchParams: Promise<{
    campus?: string;
    period?: string;
  }>;
};

export default async function MonthlyExpensesPage({
  searchParams,
}: MonthlyExpensesPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);

  if (!profile) redirect("/login");
  if (!canViewMonthlyExpenses(profile)) redirect("/dashboard");

  const allowedCampuses = allowedExpenseCampuses(profile);
  const campusSlug = resolveExpenseCampusForProfile(profile, params.campus);
  const data = await getMonthlyExpensesView(
    campusSlug,
    allowedCampuses,
    params.period
  );

  return (
    <>
      <Navbar profile={profile} />

      <main className="sfdc-page space-y-4">
        <SfdcDashboardHeader
          breadcrumb="Monthly Expenses"
          title={`${data.campusLabel} Expenses`}
          description={`${data.selectedPeriodLabel} · ${data.worksheetName} tab · ${data.periodRangeLabel}`}
          actions={<SfdcRefreshButton />}
        />

        {data.allowedCampuses.length > 1 && (
          <Suspense fallback={null}>
            <MonthlyExpensesCampusTabs
              activeCampus={data.campusSlug}
              allowedCampuses={data.allowedCampuses}
            />
          </Suspense>
        )}

        <MonthlyExpensesSection data={data} />
      </main>
    </>
  );
}
