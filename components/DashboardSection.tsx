import { BaptismsPanel } from "@/components/BaptismsPanel";
import { FirstTimeGuestsPanel } from "@/components/FirstTimeGuestsPanel";
import { KpiCardWithPeriod } from "@/components/KpiCardWithPeriod";
import { BenchmarkComparisonTable } from "@/components/BenchmarkComparisonTable";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { CampusCompareChart, GivingMonthlyChart, GivingVsExpensesChart, TrendChart } from "@/components/Charts";
import { createClient } from "@/lib/supabase/server";
import {
  findBenchmark,
  getStoplightStatus,
  metricsWhereHigherIsBetter,
} from "@/lib/benchmarks";
import {
  showBenchmarkForCardPeriod,
  type CardPeriodRange,
} from "@/lib/card-periods";
import type { CompareMode } from "@/lib/comparison";
import {
  buildCardPeriodValuesForMetric,
  getAnnualSnapshots,
  getBenchmarkTargets,
  getDashboardData,
  getGivingMonthlyTrend,
  getGivingVsExpensesTrend,
  getLastWeekAttendanceByCampus,
  getSectionMonthlySnapshots,
} from "@/lib/metrics";
import {
  metricKeysForSection,
  sectionShowsAttendanceTrend,
  sectionShowsBaptismsPanel,
  sectionShowsFirstTimeGuestsPanel,
  sectionShowsGivingTrend,
  type ViewSection,
} from "@/lib/sections";
import { getConnectEventsBaptismsForCampus } from "@/lib/connect-events";
import { getFirstTimeGuestsForCampus } from "@/lib/first-time-guests";
import type { Campus } from "@/lib/types";
import { DEFAULT_FISCAL_YEAR, TARGET_FISCAL_YEAR } from "@/lib/types";

type DashboardSectionProps = {
  section: ViewSection;
  campusId: string | null;
  compareMode: CompareMode;
  campuses: Campus[];
  canViewFinancial: boolean;
};

function getTarget(
  targets: Awaited<ReturnType<typeof getDashboardData>>["targets"],
  metricKey: string,
  campusId: string | null
) {
  const match = targets.find(
    (t) =>
      t.metric?.key === metricKey &&
      (campusId ? t.campus_id === campusId : true)
  );
  return match?.target_value ?? null;
}

function campusLabel(
  campuses: Campus[],
  campusId: string | null
): string | null {
  if (!campusId) return "All campuses";
  return campuses.find((campus) => campus.id === campusId)?.name ?? null;
}

export async function DashboardSection({
  section,
  campusId,
  compareMode,
  campuses,
  canViewFinancial,
}: DashboardSectionProps) {
  const supabase = await createClient();

  const { metrics, monthlySnapshots, targets, attendanceTrend, monthlyGiving } =
    await getDashboardData(supabase, {
      campusId: compareMode === "cross-campus" ? null : campusId,
      section,
      canViewFinancial,
    });

  const comparisonMonthlySnapshots =
    compareMode !== "off"
      ? await getSectionMonthlySnapshots(
          supabase,
          metrics.map((metric) => metric.key),
          null,
          canViewFinancial
        )
      : [];

  const [allBenchmarkTargets, allAnnualSnapshots] = await Promise.all([
    getBenchmarkTargets(supabase, TARGET_FISCAL_YEAR),
    getAnnualSnapshots(supabase, DEFAULT_FISCAL_YEAR),
  ]);

  const sectionMetricKeys = metricKeysForSection(section, canViewFinancial);
  const showLastWeekCampusChart = sectionShowsAttendanceTrend(section);
  const showGivingTrend = sectionShowsGivingTrend(section) && canViewFinancial;

  const showBaptismsPanel = sectionShowsBaptismsPanel(section);
  const showFirstTimeGuestsPanel = sectionShowsFirstTimeGuestsPanel(section);
  const cardCampusId = compareMode === "cross-campus" ? null : campusId;

  const [lastWeekAttendance, givingTrend, givingVsExpenses, connectEventsBaptisms, firstTimeGuests] =
    await Promise.all([
    showLastWeekCampusChart
      ? getLastWeekAttendanceByCampus(supabase)
      : Promise.resolve(null),
    showGivingTrend ? getGivingMonthlyTrend(supabase) : Promise.resolve([]),
    showGivingTrend ? getGivingVsExpensesTrend(supabase) : Promise.resolve([]),
    showBaptismsPanel
      ? getConnectEventsBaptismsForCampus(cardCampusId, campuses)
      : Promise.resolve(null),
    showFirstTimeGuestsPanel
      ? getFirstTimeGuestsForCampus(cardCampusId, campuses)
      : Promise.resolve(null),
  ]);

  const cardCampusLabel = campusLabel(campuses, cardCampusId);

  const lastWeekServiceLabel = lastWeekAttendance
    ? new Date(`${lastWeekAttendance.serviceDate}T12:00:00`).toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric", year: "numeric" }
      )
    : null;

  const givingTrendSubtitle = "MP · Alma · SJ stacked · Last 12 months";
  const attendanceTrendSubtitle = `${cardCampusLabel} · Last 12 months · from attendance sheet`;
  const givingVsExpensesSubtitle =
    "Church-wide · Amounts tab · Last 12 months";

  return (
    <section className="space-y-6">
      <ComparisonPanel
        mode={compareMode}
        metrics={metrics}
        snapshots={comparisonMonthlySnapshots}
        campuses={campuses}
        campusId={campusId}
      />

      {(showBaptismsPanel || showFirstTimeGuestsPanel) && (
        <div className="space-y-6">
          {showFirstTimeGuestsPanel && firstTimeGuests && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">First-Time Guests</p>
              <FirstTimeGuestsPanel data={firstTimeGuests} />
            </div>
          )}
          {showBaptismsPanel && connectEventsBaptisms && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Baptisms</p>
              <BaptismsPanel data={connectEventsBaptisms} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {metrics
          .filter(
            (metric) =>
              metric.key !== "last_week_attendance" &&
              metric.key !== "baptisms" &&
              metric.key !== "first_time_guests"
          )
          .map((metric) => {
            const valuesByPeriod = buildCardPeriodValuesForMetric(
              monthlySnapshots,
              monthlyGiving,
              metric.key,
              cardCampusId
            );

            const hasAnyValue = Object.values(valuesByPeriod).some(
              (value) => value != null
            );
            if (!hasAnyValue) return null;

            const benchmarkRow = findBenchmark(
              targets,
              metric.key,
              cardCampusId
            );
            const benchmark = benchmarkRow?.target_value ?? null;

            const stoplightByPeriod = Object.fromEntries(
              (["this-month", "previous-month", "last-3-months", "last-12-months"] as CardPeriodRange[]).map(
                (period) => {
                  const value = valuesByPeriod[period];
                  if (
                    value == null ||
                    benchmark == null ||
                    !showBenchmarkForCardPeriod(period)
                  ) {
                    return [period, null];
                  }
                  return [
                    period,
                    getStoplightStatus(
                      value,
                      benchmark,
                      metricsWhereHigherIsBetter(metric.key)
                    ),
                  ];
                }
              )
            ) as Partial<Record<CardPeriodRange, ReturnType<typeof getStoplightStatus>>>;

            let subtitleCampus = cardCampusLabel;
            if (metric.key === "giving_households") {
              subtitleCampus = "Church-wide households";
            }
            if (metric.key === "general_fund_expenses") {
              subtitleCampus = "Church-wide";
            }

            return (
              <KpiCardWithPeriod
                key={metric.id}
                metric={metric}
                valuesByPeriod={valuesByPeriod}
                target={
                  benchmark != null
                    ? getTarget(targets, metric.key, cardCampusId)
                    : null
                }
                benchmark={benchmark}
                stoplightByPeriod={stoplightByPeriod}
                benchmarkLabel={benchmarkRow?.label}
                campusLabel={subtitleCampus}
              />
            );
          })}
      </div>

      {compareMode === "off" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showGivingTrend && (
            <>
              <GivingMonthlyChart
                data={givingTrend}
                title="Giving by month (12-month rolling)"
                subtitle={givingTrendSubtitle}
              />
              <GivingVsExpensesChart
                data={givingVsExpenses}
                title="Giving vs expenses"
                subtitle={givingVsExpensesSubtitle}
              />
            </>
          )}
          {sectionShowsAttendanceTrend(section) && attendanceTrend.length > 0 && (
            <TrendChart
              data={attendanceTrend}
              title="Monthly average attendance (12 months)"
              subtitle={attendanceTrendSubtitle}
            />
          )}
          {lastWeekAttendance && lastWeekAttendance.campuses.length > 0 && (
            <CampusCompareChart
              data={lastWeekAttendance.campuses.map((campus) => ({
                campus: campus.name,
                value: campus.lastSunday,
                comparison: campus.lastMonthAvg,
              }))}
              title="Last week attendance by campus"
              valueLabel="Last Sunday"
              comparisonLabel={`${lastWeekAttendance.lastMonthLabel} avg`}
              subtitle={
                lastWeekServiceLabel
                  ? `Sunday, ${lastWeekServiceLabel} vs ${lastWeekAttendance.lastMonthLabel} average · from attendance sheet`
                  : undefined
              }
            />
          )}
        </div>
      )}

      {allBenchmarkTargets.length > 0 && (
        <BenchmarkComparisonTable
          targets={allBenchmarkTargets}
          snapshots={allAnnualSnapshots}
          campuses={campuses}
          metricKeys={sectionMetricKeys}
          campusId={cardCampusId}
        />
      )}
    </section>
  );
}
