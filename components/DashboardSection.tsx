import { GivingBudgetProgressCard } from "@/components/GivingBudgetProgressCard";
import { BaptismsPanel } from "@/components/BaptismsPanel";
import { FirstTimeGuestsPanel } from "@/components/FirstTimeGuestsPanel";
import { KpiCardWithPeriod } from "@/components/KpiCardWithPeriod";
import { BenchmarkComparisonTable } from "@/components/BenchmarkComparisonTable";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { CampusCompareChart, GivingMonthlyChart, GivingVsExpensesChart, KidsCalendarYearTrendChart, TrendChart } from "@/components/Charts";
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
  getFiscalYearGivingYtd,
  getGivingAnnualBudget,
  getGivingMonthlyTrend,
  getGivingVsExpensesTrend,
  getKidsAttendanceCalendarYearTrend,
  getKidsAttendanceMonthlyTrend,
  getLastWeekAttendanceByCampus,
  getLastWeekKidsAttendanceByCampus,
  getSectionMonthlySnapshots,
} from "@/lib/metrics";
import { getCurrentFiscalYear } from "@/lib/periods";
import {
  benchmarkTargetsForSection,
  buildMetricLayoutGroups,
  sectionShowsAttendanceTrend,
  sectionShowsBaptismsPanel,
  sectionShowsFirstTimeGuestsPanel,
  sectionShowsGivingTrend,
  sectionShowsKidsAttendanceCharts,
  sectionShowsKidsCalendarYearChart,
  type ViewSection,
} from "@/lib/sections";
import { getConnectEventsBaptismsForCampus } from "@/lib/connect-events";
import { getFirstTimeGuestsForCampus } from "@/lib/first-time-guests";
import type { Campus, Metric } from "@/lib/types";
import { DEFAULT_FISCAL_YEAR, TARGET_FISCAL_YEAR } from "@/lib/types";

type DashboardSectionProps = {
  section: ViewSection;
  campusId: string | null;
  compareMode: CompareMode;
  campuses: Campus[];
  canViewFinancial: boolean;
  fullCampusAccess?: boolean;
  churchWideAccess?: boolean;
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
  fullCampusAccess = true,
  churchWideAccess = true,
}: DashboardSectionProps) {
  const supabase = await createClient();

  const dashboardData = await getDashboardData(supabase, {
    campusId: compareMode === "cross-campus" ? null : campusId,
    section,
    canViewFinancial,
  });
  const { metrics, monthlySnapshots, attendanceTrend, monthlyGiving } =
    dashboardData;
  const targets = fullCampusAccess
    ? dashboardData.targets
    : dashboardData.targets.filter((target) =>
        target.campus_id == null
          ? churchWideAccess
          : campuses.some((campus) => campus.id === target.campus_id)
      );

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

  const visibleCampusIds = new Set(campuses.map((campus) => campus.id));
  const sectionBenchmarkTargets = benchmarkTargetsForSection(
    allBenchmarkTargets,
    section,
    canViewFinancial
  ).filter((target) =>
    target.campus_id == null
      ? churchWideAccess
      : visibleCampusIds.has(target.campus_id)
  );
  const showLastWeekCampusChart =
    sectionShowsAttendanceTrend(section) && fullCampusAccess;
  const showKidsAttendanceCharts = sectionShowsKidsAttendanceCharts(section);
  const showLastWeekKidsCampusChart =
    showKidsAttendanceCharts && fullCampusAccess;
  const showKidsCalendarYearChart = sectionShowsKidsCalendarYearChart(section);
  const showGivingTrend = sectionShowsGivingTrend(section) && canViewFinancial;
  const showGivingByCampusChart = showGivingTrend && fullCampusAccess;
  const showGivingVsExpensesChart = showGivingTrend && churchWideAccess;

  const showBaptismsPanel = sectionShowsBaptismsPanel(section);
  const showFirstTimeGuestsPanel = sectionShowsFirstTimeGuestsPanel(section);
  const cardCampusId = compareMode === "cross-campus" ? null : campusId;

  const [lastWeekAttendance, givingTrend, givingVsExpenses, connectEventsBaptisms, firstTimeGuests, kidsAttendanceTrend, kidsCalendarYearTrend, lastWeekKidsAttendance] =
    await Promise.all([
    showLastWeekCampusChart
      ? getLastWeekAttendanceByCampus(supabase)
      : Promise.resolve(null),
    showGivingByCampusChart
      ? getGivingMonthlyTrend(supabase)
      : Promise.resolve([]),
    showGivingVsExpensesChart
      ? getGivingVsExpensesTrend(supabase)
      : Promise.resolve([]),
    showBaptismsPanel
      ? getConnectEventsBaptismsForCampus(cardCampusId, campuses)
      : Promise.resolve(null),
    showFirstTimeGuestsPanel
      ? getFirstTimeGuestsForCampus(cardCampusId, campuses)
      : Promise.resolve(null),
    showKidsAttendanceCharts
      ? getKidsAttendanceMonthlyTrend(supabase, cardCampusId)
      : Promise.resolve([]),
    showKidsCalendarYearChart
      ? getKidsAttendanceCalendarYearTrend(supabase, cardCampusId)
      : Promise.resolve([]),
    showLastWeekKidsCampusChart
      ? getLastWeekKidsAttendanceByCampus(supabase)
      : Promise.resolve(null),
  ]);

  const cardCampusLabel = campusLabel(campuses, cardCampusId);

  const lastWeekServiceLabel = lastWeekAttendance
    ? new Date(`${lastWeekAttendance.serviceDate}T12:00:00`).toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric", year: "numeric" }
      )
    : null;

  const currentFiscalYear = getCurrentFiscalYear();
  const givingTrendSubtitle = `MP · Alma · SJ stacked · ${currentFiscalYear} YTD`;
  const attendanceTrendSubtitle = `${cardCampusLabel} · Last 12 months · Sunday Attendance sheet`;
  const kidsAttendanceTrendSubtitle = `${cardCampusLabel} · Last 12 months · Sunday Attendance sheet`;
  const kidsCalendarYearSubtitle = `${cardCampusLabel} · Calendar year monthly average · Sunday Attendance sheet`;
  const givingVsExpensesSubtitle =
    `Church-wide · Amounts tab · ${currentFiscalYear} YTD`;

  const lastWeekKidsServiceLabel = lastWeekKidsAttendance
    ? new Date(`${lastWeekKidsAttendance.serviceDate}T12:00:00`).toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric", year: "numeric" }
      )
    : null;

  const showGivingBudgetProgress = showGivingTrend;

  const [givingYtd, givingAnnualBudget] = await Promise.all([
    showGivingBudgetProgress
      ? getFiscalYearGivingYtd(supabase, cardCampusId)
      : Promise.resolve(null),
    showGivingBudgetProgress
      ? getGivingAnnualBudget(supabase, cardCampusId)
      : Promise.resolve(null),
  ]);

  const hiddenCardMetrics = new Set([
    "last_week_attendance",
    "baptisms",
    "first_time_guests",
  ]);
  const visibleMetrics = metrics.filter(
    (metric) => !hiddenCardMetrics.has(metric.key)
  );
  const metricsByKey = new Map(
    visibleMetrics.map((metric) => [metric.key, metric])
  );
  const metricLayoutGroups = buildMetricLayoutGroups(section, visibleMetrics);

  function renderMetricCard(metric: Metric) {
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

    const benchmarkRow = findBenchmark(targets, metric.key, cardCampusId);
    const benchmark = benchmarkRow?.target_value ?? null;

    const stoplightByPeriod = Object.fromEntries(
      (
        [
          "this-month",
          "previous-month",
          "last-3-months",
          "last-12-months",
        ] as CardPeriodRange[]
      ).map((period) => {
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
      })
    ) as Partial<
      Record<CardPeriodRange, ReturnType<typeof getStoplightStatus>>
    >;

    let subtitleCampus = cardCampusLabel;
    if (metric.key === "giving_households") {
      subtitleCampus = "Church-wide households";
    }
    if (metric.key === "general_fund_expenses") {
      subtitleCampus = "Church-wide";
    }

    let budgetPaceGauge = null;

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
        budgetPaceGauge={budgetPaceGauge}
      />
    );
  }

  return (
    <section
      className={section === "operations" ? "sfdc-operations" : "space-y-4"}
    >
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

      {showGivingBudgetProgress &&
        givingYtd != null &&
        givingAnnualBudget != null && (
          <div className="sfdc-operations__summary">
            <GivingBudgetProgressCard
              fiscalYearLabel={currentFiscalYear}
              actualYtd={givingYtd}
              annualBudget={givingAnnualBudget}
              campusLabel={cardCampusLabel}
            />

            <div className="sfdc-operations__kpis">
              <div className="sfdc-metric-rows">
                {metricLayoutGroups.map((group, groupIndex) => (
                  <div
                    key={`${group.columns}-${groupIndex}`}
                    className={`sfdc-grid sfdc-grid--${group.columns}${
                      group.keys.length === 1 ? " sfdc-grid--single" : ""
                    }`}
                  >
                    {group.keys.map((metricKey) => {
                      const metric = metricsByKey.get(metricKey);
                      if (!metric) return null;
                      return renderMetricCard(metric);
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      {!(
        showGivingBudgetProgress &&
        givingYtd != null &&
        givingAnnualBudget != null
      ) && (
        <div className="sfdc-metric-rows">
          {metricLayoutGroups.map((group, groupIndex) => (
            <div
              key={`${group.columns}-${groupIndex}`}
              className={`sfdc-grid sfdc-grid--${group.columns}${
                group.keys.length === 1 ? " sfdc-grid--single" : ""
              }`}
            >
              {group.keys.map((metricKey) => {
                const metric = metricsByKey.get(metricKey);
                if (!metric) return null;
                return renderMetricCard(metric);
              })}
            </div>
          ))}
        </div>
      )}

      {compareMode === "off" && (
        <div
          className={`sfdc-grid sfdc-grid--2${
            section === "operations" ? " sfdc-operations__charts" : ""
          }`}
        >
          {showGivingByCampusChart && (
            <GivingMonthlyChart
              data={givingTrend}
              title={`Giving by month (${currentFiscalYear} YTD)`}
              subtitle={givingTrendSubtitle}
            />
          )}
          {showGivingVsExpensesChart && (
            <GivingVsExpensesChart
              data={givingVsExpenses}
              title="Giving vs expenses"
              subtitle={givingVsExpensesSubtitle}
            />
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
                  ? `Sunday, ${lastWeekServiceLabel} vs ${lastWeekAttendance.lastMonthLabel} average · Sunday Attendance sheet`
                  : undefined
              }
            />
          )}
          {showKidsCalendarYearChart && kidsCalendarYearTrend.length > 0 && (
            <KidsCalendarYearTrendChart
              data={kidsCalendarYearTrend}
              title="Monthly average kids attendance (calendar year)"
              subtitle={kidsCalendarYearSubtitle}
            />
          )}
          {showKidsAttendanceCharts && kidsAttendanceTrend.length > 0 && (
            <TrendChart
              data={kidsAttendanceTrend}
              title="Monthly average kids attendance (12 months)"
              subtitle={kidsAttendanceTrendSubtitle}
            />
          )}
          {showKidsAttendanceCharts &&
            lastWeekKidsAttendance &&
            lastWeekKidsAttendance.campuses.length > 0 && (
              <CampusCompareChart
                data={lastWeekKidsAttendance.campuses.map((campus) => ({
                  campus: campus.name,
                  value: campus.lastSunday,
                  comparison: campus.lastMonthAvg,
                }))}
                title="Last week kids attendance by campus"
                valueLabel="Last Sunday"
                comparisonLabel={`${lastWeekKidsAttendance.lastMonthLabel} avg`}
                subtitle={
                  lastWeekKidsServiceLabel
                    ? `Sunday, ${lastWeekKidsServiceLabel} vs ${lastWeekKidsAttendance.lastMonthLabel} average · Sunday Attendance sheet`
                    : undefined
                }
              />
            )}
        </div>
      )}

      {sectionBenchmarkTargets.length > 0 && (
        <BenchmarkComparisonTable
          targets={sectionBenchmarkTargets}
          snapshots={allAnnualSnapshots}
          campuses={campuses}
          campusId={cardCampusId}
        />
      )}
    </section>
  );
}
