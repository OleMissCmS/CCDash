import {
  buildAttendanceAggregates,
  fetchParsedAttendanceYears,
  type AttendanceCampusSlug,
  type FiscalYearAttendanceAggregate,
  type MonthlyAttendanceAggregate,
  type ParsedSundayAttendance,
} from "./google-sheets-attendance";
import { createAdminClient } from "./supabase/admin";

const ATTENDANCE_METRIC_KEYS = [
  "total_in_person_avg",
  "adult_worship_avg",
  "kids_avg",
  "kids_pct_of_attendance",
  "last_week_attendance",
] as const;

type AttendanceMetricKey = (typeof ATTENDANCE_METRIC_KEYS)[number];

type SnapshotInsert = {
  campus_id: string | null;
  metric_id: string;
  period_start: string;
  period_type: "monthly" | "annual" | "weekly_avg";
  fiscal_year: string | null;
  calendar_year: number | null;
  value: number;
  source: string;
};

type SyncAttendanceResult = {
  sundayCount: number;
  monthlyCount: number;
  annualCount: number;
  yearsFetched: number[];
  dateRange: { start: string; end: string } | null;
};

function roundMetric(value: number): number {
  return Number(value.toFixed(1));
}

function buildMonthlySnapshotRows(
  month: MonthlyAttendanceAggregate,
  metricIds: Record<AttendanceMetricKey, string>,
  campusIds: Record<AttendanceCampusSlug, string>
): SnapshotInsert[] {
  const rows: SnapshotInsert[] = [];

  if (month.inPersonTotal !== null) {
    rows.push({
      campus_id: null,
      metric_id: metricIds.total_in_person_avg,
      period_start: month.periodStart,
      period_type: "monthly",
      fiscal_year: null,
      calendar_year: null,
      value: roundMetric(month.inPersonTotal),
      source: "google_sheets",
    });
  }

  if (month.inPersonAdultsTotal !== null) {
    rows.push({
      campus_id: null,
      metric_id: metricIds.adult_worship_avg,
      period_start: month.periodStart,
      period_type: "monthly",
      fiscal_year: null,
      calendar_year: null,
      value: roundMetric(month.inPersonAdultsTotal),
      source: "google_sheets",
    });
  }

  for (const slug of Object.keys(campusIds) as AttendanceCampusSlug[]) {
    const campus = month.campuses[slug];
    const campusId = campusIds[slug];
    if (!campus) continue;

    if (campus.total !== null) {
      rows.push({
        campus_id: campusId,
        metric_id: metricIds.total_in_person_avg,
        period_start: month.periodStart,
        period_type: "monthly",
        fiscal_year: null,
        calendar_year: null,
        value: roundMetric(campus.total),
        source: "google_sheets",
      });
    }

    if (campus.kids !== null) {
      rows.push({
        campus_id: campusId,
        metric_id: metricIds.kids_avg,
        period_start: month.periodStart,
        period_type: "monthly",
        fiscal_year: null,
        calendar_year: null,
        value: roundMetric(campus.kids),
        source: "google_sheets",
      });
    }

    if (campus.kidsPct !== null) {
      rows.push({
        campus_id: campusId,
        metric_id: metricIds.kids_pct_of_attendance,
        period_start: month.periodStart,
        period_type: "monthly",
        fiscal_year: null,
        calendar_year: null,
        value: roundMetric(campus.kidsPct),
        source: "google_sheets",
      });
    }
  }

  return rows;
}

function buildAnnualSnapshotRows(
  fiscal: FiscalYearAttendanceAggregate,
  metricIds: Record<AttendanceMetricKey, string>,
  campusIds: Record<AttendanceCampusSlug, string>
): SnapshotInsert[] {
  const periodStart = fiscalYearPeriodStart(fiscal.fiscalYear);
  const rows: SnapshotInsert[] = [];

  if (fiscal.inPersonTotal !== null) {
    rows.push({
      campus_id: null,
      metric_id: metricIds.total_in_person_avg,
      period_start: periodStart,
      period_type: "annual",
      fiscal_year: fiscal.fiscalYear,
      calendar_year: null,
      value: roundMetric(fiscal.inPersonTotal),
      source: "google_sheets",
    });
  }

  if (fiscal.inPersonAdultsTotal !== null) {
    rows.push({
      campus_id: null,
      metric_id: metricIds.adult_worship_avg,
      period_start: periodStart,
      period_type: "annual",
      fiscal_year: fiscal.fiscalYear,
      calendar_year: null,
      value: roundMetric(fiscal.inPersonAdultsTotal),
      source: "google_sheets",
    });
  }

  for (const slug of Object.keys(campusIds) as AttendanceCampusSlug[]) {
    const campus = fiscal.campuses[slug];
    const campusId = campusIds[slug];
    if (!campus) continue;

    if (campus.total !== null) {
      rows.push({
        campus_id: campusId,
        metric_id: metricIds.total_in_person_avg,
        period_start: periodStart,
        period_type: "annual",
        fiscal_year: fiscal.fiscalYear,
        calendar_year: null,
        value: roundMetric(campus.total),
        source: "google_sheets",
      });
    }

    if (campus.kids !== null) {
      rows.push({
        campus_id: campusId,
        metric_id: metricIds.kids_avg,
        period_start: periodStart,
        period_type: "annual",
        fiscal_year: fiscal.fiscalYear,
        calendar_year: null,
        value: roundMetric(campus.kids),
        source: "google_sheets",
      });
    }

    if (campus.kidsPct !== null) {
      rows.push({
        campus_id: campusId,
        metric_id: metricIds.kids_pct_of_attendance,
        period_start: periodStart,
        period_type: "annual",
        fiscal_year: fiscal.fiscalYear,
        calendar_year: null,
        value: roundMetric(campus.kidsPct),
        source: "google_sheets",
      });
    }
  }

  return rows;
}

function fiscalYearPeriodStart(fiscalYear: string): string {
  const startYear = Number(`20${fiscalYear.slice(2, 4)}`);
  return `${startYear}-05-01`;
}

function buildWeeklySnapshotRows(
  sundays: ParsedSundayAttendance[],
  lastWeekMetricId: string,
  campusIds: Record<AttendanceCampusSlug, string>
): SnapshotInsert[] {
  const rows: SnapshotInsert[] = [];

  for (const sunday of sundays) {
    for (const slug of Object.keys(campusIds) as AttendanceCampusSlug[]) {
      const campus = sunday.campuses[slug];
      if (!campus) continue;

      rows.push({
        campus_id: campusIds[slug],
        metric_id: lastWeekMetricId,
        period_start: sunday.date,
        period_type: "weekly_avg",
        fiscal_year: null,
        calendar_year: null,
        value: roundMetric(campus.total),
        source: "google_sheets",
      });
    }
  }

  return rows;
}

export async function syncAttendanceFromGoogleSheets(
  years?: number[]
): Promise<SyncAttendanceResult> {
  const currentYear = new Date().getFullYear();
  const yearsToFetch = years ?? [currentYear - 2, currentYear - 1, currentYear];

  const sundays = await fetchParsedAttendanceYears(yearsToFetch);
  const { monthly, fiscalYears } = buildAttendanceAggregates(sundays);

  const supabase = createAdminClient();

  const [{ data: metrics }, { data: campuses }] = await Promise.all([
    supabase.from("metrics").select("id, key").in("key", ATTENDANCE_METRIC_KEYS),
    supabase.from("campuses").select("id, slug"),
  ]);

  if (!metrics?.length || !campuses?.length) {
    throw new Error("Missing attendance metrics or campuses in the database.");
  }

  const metricIds = Object.fromEntries(
    metrics.map((metric) => [metric.key, metric.id])
  ) as Record<AttendanceMetricKey, string>;

  const campusIds = Object.fromEntries(
    campuses.map((campus) => [campus.slug, campus.id])
  ) as Record<AttendanceCampusSlug, string>;

  const metricIdList = metrics.map((metric) => metric.id);
  const monthStarts = monthly.map((row) => row.periodStart);
  const fiscalYearLabels = fiscalYears.map((row) => row.fiscalYear);

  if (monthStarts.length > 0) {
    const { error: deleteMonthlyError } = await supabase
      .from("metric_snapshots")
      .delete()
      .in("metric_id", metricIdList)
      .eq("period_type", "monthly")
      .in("period_start", monthStarts);

    if (deleteMonthlyError) {
      throw new Error(
        `Failed to clear monthly attendance snapshots: ${deleteMonthlyError.message}`
      );
    }
  }

  if (fiscalYearLabels.length > 0) {
    const { error: deleteAnnualError } = await supabase
      .from("metric_snapshots")
      .delete()
      .in("metric_id", metricIdList)
      .eq("period_type", "annual")
      .in("fiscal_year", fiscalYearLabels);

    if (deleteAnnualError) {
      throw new Error(
        `Failed to clear annual attendance snapshots: ${deleteAnnualError.message}`
      );
    }
  }

  const lastWeekMetricId = metricIds.last_week_attendance;
  if (!lastWeekMetricId) {
    throw new Error("Missing last_week_attendance metric in the database.");
  }

  const { error: deleteWeeklyError } = await supabase
    .from("metric_snapshots")
    .delete()
    .eq("metric_id", lastWeekMetricId)
    .eq("period_type", "weekly_avg")
    .eq("source", "google_sheets");

  if (deleteWeeklyError) {
    throw new Error(
      `Failed to clear weekly attendance snapshots: ${deleteWeeklyError.message}`
    );
  }

  const inserts = [
    ...monthly.flatMap((month) =>
      buildMonthlySnapshotRows(month, metricIds, campusIds)
    ),
    ...fiscalYears.flatMap((fiscal) =>
      buildAnnualSnapshotRows(fiscal, metricIds, campusIds)
    ),
    ...buildWeeklySnapshotRows(sundays, lastWeekMetricId, campusIds),
  ];

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from("metric_snapshots")
      .insert(inserts);

    if (insertError) {
      throw new Error(`Failed to insert attendance snapshots: ${insertError.message}`);
    }
  }

  return {
    sundayCount: sundays.length,
    monthlyCount: monthly.length,
    annualCount: fiscalYears.length,
    yearsFetched: yearsToFetch,
    dateRange:
      sundays.length > 0
        ? {
            start: sundays[0].date,
            end: sundays[sundays.length - 1].date,
          }
        : null,
  };
}
