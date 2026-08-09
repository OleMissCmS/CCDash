import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAttendanceAggregates,
  fetchParsedAttendanceYears,
  type AttendanceCampusSlug,
} from "./google-sheets-attendance";
import {
  buildMetricCardPeriodValues,
  getCardPeriodBounds,
  type CardPeriodRange,
} from "./card-periods";
import {
  CALENDAR_YEAR,
  collapseMonthlyToSnapshots,
  fiscalYearForPeriod,
  getFiscalYearMonthlyBounds,
  getMonthlyPeriodBounds,
  getPreviousCalendarMonthStart,
  isAnnualPeriod,
  type PeriodRange,
} from "./periods";
import {
  filterMetricsForSection,
  sectionShowsAttendanceTrend,
  sectionUsesBaptismsYearMode,
  type ViewSection,
} from "./sections";
import type {
  AlertThreshold,
  BenchmarkTarget,
  Campus,
  Concern,
  Metric,
  MetricCategory,
  MetricSnapshot,
  UserProfile,
} from "./types";
import { DEFAULT_FISCAL_YEAR, TARGET_FISCAL_YEAR } from "./types";

export const STEWARDSHIP_MONTHLY_METRICS = [
  "total_giving",
  "giving_households",
  "general_fund_expenses",
] as const;

function collapseStewardshipMonthlyToSnapshots(
  monthlySnapshots: MetricSnapshot[]
): MetricSnapshot[] {
  const grouped = new Map<string, MetricSnapshot[]>();

  for (const row of monthlySnapshots) {
    const key = `${row.metric_id}:${row.campus_id ?? "all"}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return [...grouped.entries()].map(([, rows]) => {
    const sample = rows[0];
    const metricKey = sample.metric?.key;
    const unit = sample.metric?.unit;
    let value: number;

    if (metricKey === "giving_households") {
      value = rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
    } else if (unit === "percent") {
      value = rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
    } else {
      value = rows.reduce((sum, row) => sum + row.value, 0);
    }

    return {
      ...sample,
      value,
      period_start: rows[rows.length - 1].period_start,
    };
  });
}

export async function getStewardshipSnapshotsForPeriod(
  supabase: SupabaseClient,
  period: PeriodRange,
  campusId?: string | null
): Promise<MetricSnapshot[]> {
  let bounds: { start: string; end: string } | null = null;
  const fiscalYear = fiscalYearForPeriod(period);

  if (fiscalYear) {
    bounds = getFiscalYearMonthlyBounds(fiscalYear);
  } else if (period === "calendar-year") {
    bounds = {
      start: `${CALENDAR_YEAR}-01-01`,
      end: `${CALENDAR_YEAR}-12-01`,
    };
  } else {
    bounds = getMonthlyPeriodBounds(period);
  }

  if (!bounds) return [];

  const monthly = await getMonthlySnapshotsInRange(
    supabase,
    bounds.start,
    bounds.end,
    campusId
  );

  const filtered = monthly.filter((row) =>
    STEWARDSHIP_MONTHLY_METRICS.includes(
      row.metric?.key as (typeof STEWARDSHIP_MONTHLY_METRICS)[number]
    )
  );

  return collapseStewardshipMonthlyToSnapshots(filtered);
}

function mergeSnapshotSets(
  base: MetricSnapshot[],
  overrides: MetricSnapshot[],
  metricKeys: readonly string[]
): MetricSnapshot[] {
  const replace = new Set(metricKeys);
  const kept = base.filter((row) => !replace.has(row.metric?.key ?? ""));
  return [...kept, ...overrides];
}

export async function getGivingPreviousMonthSnapshots(
  supabase: SupabaseClient,
  campusId?: string | null
): Promise<MetricSnapshot[]> {
  const periodStart = getPreviousCalendarMonthStart();
  const monthly = await getMonthlySnapshotsInRange(
    supabase,
    periodStart,
    periodStart,
    campusId
  );

  return monthly.filter((row) => row.metric?.key === "giving_previous_month");
}

export async function getUserProfile(
  supabase: SupabaseClient
): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select(
      "id, display_name, role, financial_insights, can_view_overview, can_view_adult_discipleship, can_view_next_gen, can_view_weekend_reach, can_view_operations, can_edit_benchmarks, can_access_chms, can_manage_chms_processes"
    )
    .eq("id", user.id)
    .single();

  return data;
}

export async function getCampuses(
  supabase: SupabaseClient
): Promise<Campus[]> {
  const { data } = await supabase
    .from("campuses")
    .select("*")
    .order("sort_order");
  return data ?? [];
}

export async function getMetrics(
  supabase: SupabaseClient,
  category?: MetricCategory
): Promise<Metric[]> {
  let query = supabase.from("metrics").select("*").order("sort_order");
  if (category) query = query.eq("category", category);
  const { data } = await query;
  return data ?? [];
}

export async function getAnnualSnapshots(
  supabase: SupabaseClient,
  fiscalYear: string = DEFAULT_FISCAL_YEAR,
  campusId?: string | null
): Promise<MetricSnapshot[]> {
  let query = supabase
    .from("metric_snapshots")
    .select("*, metric:metrics(*), campus:campuses(*)")
    .eq("period_type", "annual")
    .eq("fiscal_year", fiscalYear);

  if (campusId) query = query.eq("campus_id", campusId);

  const { data } = await query;
  return (data ?? []) as MetricSnapshot[];
}

export async function getCalendarYearSnapshots(
  supabase: SupabaseClient,
  calendarYear: number = CALENDAR_YEAR,
  campusId?: string | null
): Promise<MetricSnapshot[]> {
  let query = supabase
    .from("metric_snapshots")
    .select("*, metric:metrics(*), campus:campuses(*)")
    .eq("period_type", "annual")
    .eq("calendar_year", calendarYear)
    .is("fiscal_year", null);

  if (campusId) query = query.eq("campus_id", campusId);

  const { data } = await query;
  return (data ?? []) as MetricSnapshot[];
}

export async function getMonthlySnapshotsInRange(
  supabase: SupabaseClient,
  start: string,
  end: string,
  campusId?: string | null
): Promise<MetricSnapshot[]> {
  let query = supabase
    .from("metric_snapshots")
    .select("*, metric:metrics(*), campus:campuses(*)")
    .eq("period_type", "monthly")
    .gte("period_start", start)
    .lte("period_start", end)
    .order("period_start");

  if (campusId) query = query.eq("campus_id", campusId);

  const { data } = await query;
  return (data ?? []) as MetricSnapshot[];
}

export async function getSnapshotsForPeriod(
  supabase: SupabaseClient,
  period: PeriodRange,
  campusId?: string | null
): Promise<MetricSnapshot[]> {
  const fiscalYear = fiscalYearForPeriod(period);
  if (fiscalYear) {
    return getAnnualSnapshots(supabase, fiscalYear, campusId);
  }

  if (period === "calendar-year") {
    const [fiscalAnnual, calendarAnnual] = await Promise.all([
      getAnnualSnapshots(supabase, DEFAULT_FISCAL_YEAR, campusId),
      getCalendarYearSnapshots(supabase, CALENDAR_YEAR, campusId),
    ]);

    const calendarKeys = new Set(
      calendarAnnual.map((row) => `${row.metric_id}:${row.campus_id ?? "all"}`)
    );

    const fiscalOnly = fiscalAnnual.filter(
      (row) =>
        !calendarKeys.has(`${row.metric_id}:${row.campus_id ?? "all"}`)
    );

    return [...fiscalOnly, ...calendarAnnual];
  }

  const bounds = getMonthlyPeriodBounds(period);
  if (!bounds) return [];

  const monthly = await getMonthlySnapshotsInRange(
    supabase,
    bounds.start,
    bounds.end,
    campusId
  );

  return collapseMonthlyToSnapshots(monthly);
}

export async function getAttendanceMonthlyTrend(
  supabase: SupabaseClient,
  campusId?: string | null,
  monthCount = ATTENDANCE_TREND_MONTHS
): Promise<AttendanceMonthlyTrendPoint[]> {
  const { data: metric } = await supabase
    .from("metrics")
    .select("id")
    .eq("key", "total_in_person_avg")
    .single();

  if (!metric) return [];

  let query = supabase
    .from("metric_snapshots")
    .select("period_start, value")
    .eq("metric_id", metric.id)
    .eq("period_type", "monthly")
    .order("period_start", { ascending: false });

  if (campusId) {
    query = query.eq("campus_id", campusId);
  } else {
    query = query.is("campus_id", null);
  }

  const { data } = await query;

  return (data ?? [])
    .filter((row) => row.value != null && row.value > 0)
    .slice(0, monthCount)
    .reverse()
    .map((row) => ({
      periodStart: row.period_start,
      value: row.value,
    }));
}

export async function getMonthlyTrend(
  supabase: SupabaseClient,
  metricKey: string,
  campusId?: string | null
): Promise<MetricSnapshot[]> {
  const { data: metric } = await supabase
    .from("metrics")
    .select("id")
    .eq("key", metricKey)
    .single();

  if (!metric) return [];

  let query = supabase
    .from("metric_snapshots")
    .select("*, metric:metrics(*), campus:campuses(*)")
    .eq("metric_id", metric.id)
    .eq("period_type", "monthly")
    .order("period_start");

  if (campusId) query = query.eq("campus_id", campusId);

  const { data } = await query;
  return (data ?? []) as MetricSnapshot[];
}

const GIVING_TREND_MONTHS = 12;
const ATTENDANCE_TREND_MONTHS = 12;

export type AttendanceMonthlyTrendPoint = {
  periodStart: string;
  value: number;
};

type GivingCampusChartSlug = "mount-pleasant" | "alma" | "st-johns";

export const GIVING_CAMPUS_CHART_SERIES: Array<{
  slug: GivingCampusChartSlug;
  label: string;
  color: string;
}> = [
  { slug: "mount-pleasant", label: "MP", color: "oklch(0.52 0.17 25)" },
  { slug: "alma", label: "Alma", color: "oklch(0.52 0.12 250)" },
  { slug: "st-johns", label: "SJ", color: "oklch(0.52 0.1 145)" },
];

export type GivingMonthlyTrendPoint = {
  periodStart: string;
  campuses: Record<GivingCampusChartSlug, number>;
  total: number;
};

function emptyCampusTotals(): Record<GivingCampusChartSlug, number> {
  return {
    "mount-pleasant": 0,
    alma: 0,
    "st-johns": 0,
  };
}

export async function getGivingMonthlyTrend(
  supabase: SupabaseClient,
  monthCount = GIVING_TREND_MONTHS
): Promise<GivingMonthlyTrendPoint[]> {
  const { data: metric } = await supabase
    .from("metrics")
    .select("id")
    .eq("key", "total_giving")
    .single();

  if (!metric) return [];

  const slugs = GIVING_CAMPUS_CHART_SERIES.map((campus) => campus.slug);
  const { data: campuses } = await supabase
    .from("campuses")
    .select("id, slug")
    .in("slug", slugs);

  if (!campuses?.length) return [];

  const slugByCampusId = new Map(
    campuses.map((campus) => [campus.id, campus.slug as GivingCampusChartSlug])
  );

  const { data } = await supabase
    .from("metric_snapshots")
    .select("period_start, value, campus_id")
    .eq("metric_id", metric.id)
    .eq("period_type", "monthly")
    .in(
      "campus_id",
      campuses.map((campus) => campus.id)
    )
    .order("period_start", { ascending: false });

  const byMonth = new Map<string, GivingMonthlyTrendPoint>();

  for (const row of data ?? []) {
    if (!row.campus_id) continue;
    const slug = slugByCampusId.get(row.campus_id);
    if (!slug) continue;

    const point =
      byMonth.get(row.period_start) ??
      {
        periodStart: row.period_start,
        campuses: emptyCampusTotals(),
        total: 0,
      };

    point.campuses[slug] = row.value;
    byMonth.set(row.period_start, point);
  }

  return [...byMonth.values()]
    .map((point) => ({
      ...point,
      total: GIVING_CAMPUS_CHART_SERIES.reduce(
        (sum, campus) => sum + point.campuses[campus.slug],
        0
      ),
    }))
    .filter((point) => point.total > 0)
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
    .slice(0, monthCount)
    .reverse();
}

export type GivingVsExpensesPoint = {
  periodStart: string;
  giving: number;
  expenses: number;
  net: number;
};

async function getChurchWideMonthlyMetricValues(
  supabase: SupabaseClient,
  metricKey: string
): Promise<Map<string, number>> {
  const { data: metric } = await supabase
    .from("metrics")
    .select("id")
    .eq("key", metricKey)
    .single();

  if (!metric) return new Map();

  const { data } = await supabase
    .from("metric_snapshots")
    .select("period_start, value")
    .eq("metric_id", metric.id)
    .eq("period_type", "monthly")
    .is("campus_id", null)
    .order("period_start", { ascending: false });

  const byMonth = new Map<string, number>();
  for (const row of data ?? []) {
    if (!byMonth.has(row.period_start)) {
      byMonth.set(row.period_start, row.value);
    }
  }

  return byMonth;
}

export async function getGivingVsExpensesTrend(
  supabase: SupabaseClient,
  monthCount = GIVING_TREND_MONTHS
): Promise<GivingVsExpensesPoint[]> {
  const [givingByMonth, expensesByMonth] = await Promise.all([
    getChurchWideMonthlyMetricValues(supabase, "total_giving"),
    getChurchWideMonthlyMetricValues(supabase, "general_fund_expenses"),
  ]);

  const periodStarts = new Set([
    ...givingByMonth.keys(),
    ...expensesByMonth.keys(),
  ]);

  return [...periodStarts]
    .map((periodStart) => {
      const giving = givingByMonth.get(periodStart) ?? 0;
      const expenses = expensesByMonth.get(periodStart) ?? 0;
      return {
        periodStart,
        giving,
        expenses,
        net: giving - expenses,
      };
    })
    .filter((point) => point.giving > 0 || point.expenses > 0)
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
    .slice(0, monthCount)
    .reverse();
}

export type LastWeekAttendanceByCampus = {
  serviceDate: string;
  lastMonthLabel: string;
  campuses: Array<{
    name: string;
    lastSunday: number;
    lastMonthAvg: number | null;
  }>;
};

const ATTENDANCE_CAMPUS_SLUGS: AttendanceCampusSlug[] = [
  "mount-pleasant",
  "alma",
  "st-johns",
];

function formatMonthStartLabel(periodStart: string): string {
  const date = new Date(`${periodStart}T12:00:00`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

async function getLastWeekAttendanceFromDb(
  supabase: SupabaseClient
): Promise<LastWeekAttendanceByCampus | null> {
  const { data: metric } = await supabase
    .from("metrics")
    .select("id")
    .eq("key", "last_week_attendance")
    .single();

  if (!metric) return null;

  const { data: latestRows } = await supabase
    .from("metric_snapshots")
    .select("period_start")
    .eq("metric_id", metric.id)
    .eq("period_type", "weekly_avg")
    .order("period_start", { ascending: false })
    .limit(1);

  const serviceDate = latestRows?.[0]?.period_start;
  if (!serviceDate) return null;

  const { data } = await supabase
    .from("metric_snapshots")
    .select("*, campus:campuses(*)")
    .eq("metric_id", metric.id)
    .eq("period_type", "weekly_avg")
    .eq("period_start", serviceDate)
    .not("campus_id", "is", null)
    .order("campus_id");

  if (!data?.length) return null;

  const rows = data as MetricSnapshot[];
  const previousMonthStart = getPreviousCalendarMonthStart();

  return {
    serviceDate,
    lastMonthLabel: formatMonthStartLabel(previousMonthStart),
    campuses: rows.map((row) => ({
      name: row.campus?.name ?? "Campus",
      lastSunday: row.value,
      lastMonthAvg: null,
    })),
  };
}

export async function getLastWeekAttendanceByCampus(
  supabase: SupabaseClient
): Promise<LastWeekAttendanceByCampus | null> {
  try {
    const currentYear = new Date().getFullYear();
    const sundays = await fetchParsedAttendanceYears([
      currentYear - 1,
      currentYear,
    ]);

    if (sundays.length === 0) {
      return getLastWeekAttendanceFromDb(supabase);
    }

    const latestSunday = sundays[sundays.length - 1];
    const previousMonthStart = getPreviousCalendarMonthStart();
    const { monthly } = buildAttendanceAggregates(sundays);
    const previousMonth = monthly.find(
      (month) => month.periodStart === previousMonthStart
    );

    const campuses = await getCampuses(supabase);
    const campusNameBySlug = new Map(
      campuses.map((campus) => [campus.slug, campus.name])
    );

    const campusRows = ATTENDANCE_CAMPUS_SLUGS.map((slug) => {
      const lastSunday = latestSunday.campuses[slug]?.total ?? null;
      const lastMonthAvg = previousMonth?.campuses[slug]?.total ?? null;
      if (lastSunday == null && lastMonthAvg == null) return null;

      return {
        name: campusNameBySlug.get(slug) ?? slug,
        lastSunday: lastSunday ?? 0,
        lastMonthAvg,
      };
    }).filter((campus): campus is NonNullable<typeof campus> => campus != null);

    if (campusRows.length === 0) {
      return getLastWeekAttendanceFromDb(supabase);
    }

    return {
      serviceDate: latestSunday.date,
      lastMonthLabel: formatMonthStartLabel(previousMonthStart),
      campuses: campusRows,
    };
  } catch {
    return getLastWeekAttendanceFromDb(supabase);
  }
}

export async function getLatestMonthlySnapshots(
  supabase: SupabaseClient,
  metricKey: string,
  campusId?: string | null
): Promise<MetricSnapshot[]> {
  const { data: metric } = await supabase
    .from("metrics")
    .select("id")
    .eq("key", metricKey)
    .single();

  if (!metric) return [];

  let query = supabase
    .from("metric_snapshots")
    .select("*, metric:metrics(*), campus:campuses(*)")
    .eq("metric_id", metric.id)
    .eq("period_type", "monthly")
    .order("period_start", { ascending: false });

  if (campusId) query = query.eq("campus_id", campusId);

  const { data } = await query;
  return (data ?? []) as MetricSnapshot[];
}

export async function getBenchmarkTargets(
  supabase: SupabaseClient,
  fiscalYear: string = TARGET_FISCAL_YEAR,
  campusId?: string | null
): Promise<BenchmarkTarget[]> {
  let query = supabase
    .from("benchmark_targets")
    .select("*, metric:metrics(*), campus:campuses(*)")
    .eq("fiscal_year", fiscalYear)
    .order("campus_id", { ascending: true, nullsFirst: true });

  if (campusId) query = query.eq("campus_id", campusId);

  const { data } = await query;
  return (data ?? []) as BenchmarkTarget[];
}

export async function getBaptismsForPeriod(
  supabase: SupabaseClient,
  period: PeriodRange,
  campusId?: string | null
): Promise<MetricSnapshot[]> {
  if (!isAnnualPeriod(period)) {
    const bounds = getMonthlyPeriodBounds(period);
    if (!bounds) return [];

    const monthly = await getMonthlySnapshotsInRange(
      supabase,
      bounds.start,
      bounds.end,
      campusId
    );

    return collapseMonthlyToSnapshots(
      monthly.filter((row) => row.metric?.key === "baptisms")
    );
  }

  const { data: metric } = await supabase
    .from("metrics")
    .select("id")
    .eq("key", "baptisms")
    .single();

  if (!metric) return [];

  let query = supabase
    .from("metric_snapshots")
    .select("*, campus:campuses(*)")
    .eq("metric_id", metric.id)
    .eq("period_type", "annual");

  const fiscalYear = fiscalYearForPeriod(period);
  if (fiscalYear) {
    query = query.eq("fiscal_year", fiscalYear);
  } else {
    query = query.eq("calendar_year", CALENDAR_YEAR).is("fiscal_year", null);
  }

  if (campusId) query = query.eq("campus_id", campusId);

  const { data } = await query;
  return (data ?? []) as MetricSnapshot[];
}

export async function getAlertThresholds(
  supabase: SupabaseClient
): Promise<AlertThreshold[]> {
  const { data } = await supabase
    .from("alert_thresholds")
    .select("*, metric:metrics(*), campus:campuses(*)")
    .eq("is_enabled", true);
  return (data ?? []) as AlertThreshold[];
}

export function getLatestMonthlyValue(
  snapshots: MetricSnapshot[],
  metricKey: string,
  campusId: string | null
): number | null {
  const matches = snapshots.filter((s) => s.metric?.key === metricKey);
  if (matches.length === 0) return null;

  if (campusId) {
    const campusRows = matches.filter((s) => s.campus_id === campusId);
    if (campusRows.length === 0) return null;
    return campusRows[0].value;
  }

  const latestByCampus = new Map<string, MetricSnapshot>();
  for (const row of matches) {
    if (!row.campus_id) continue;
    const existing = latestByCampus.get(row.campus_id);
    if (!existing || row.period_start > existing.period_start) {
      latestByCampus.set(row.campus_id, row);
    }
  }

  if (latestByCampus.size === 0) {
    return matches[0]?.value ?? null;
  }

  return [...latestByCampus.values()].reduce((sum, row) => sum + row.value, 0);
}

export function getSnapshotValue(
  snapshots: MetricSnapshot[],
  metricKey: string,
  campusId: string | null
): number | null {
  const matches = snapshots.filter((s) => s.metric?.key === metricKey);
  if (matches.length === 0) return null;

  if (campusId) {
    return matches.find((s) => s.campus_id === campusId)?.value ?? null;
  }

  const churchWide = matches.find((s) => s.campus_id == null);
  if (churchWide) return churchWide.value;

  if (matches.length === 1) return matches[0].value;

  const campusRows = matches.filter((s) => s.campus_id != null);
  if (campusRows.length === 0) return matches[0].value;

  const unit = matches[0].metric?.unit;
  if (unit === "percent") {
    return (
      campusRows.reduce((sum, s) => sum + s.value, 0) / campusRows.length
    );
  }
  return campusRows.reduce((sum, s) => sum + s.value, 0);
}

export function aggregateChurchWide(
  snapshots: MetricSnapshot[],
  metricKey: string
): number {
  return getSnapshotValue(snapshots, metricKey, null) ?? 0;
}

export async function getSectionCardMonthlySnapshots(
  supabase: SupabaseClient,
  metricKeys: string[],
  campusId?: string | null
): Promise<MetricSnapshot[]> {
  if (metricKeys.length === 0) return [];

  const { data: metrics } = await supabase
    .from("metrics")
    .select("id")
    .in("key", metricKeys);

  if (!metrics?.length) return [];

  const bounds = getCardPeriodBounds("last-12-months");
  const metricIds = metrics.map((metric) => metric.id);

  let query = supabase
    .from("metric_snapshots")
    .select("*, metric:metrics(*), campus:campuses(*)")
    .in("metric_id", metricIds)
    .eq("period_type", "monthly")
    .gte("period_start", bounds.start)
    .lte("period_start", bounds.end)
    .order("period_start");

  if (campusId) query = query.eq("campus_id", campusId);

  const { data } = await query;
  return (data ?? []) as MetricSnapshot[];
}

export async function getSectionMonthlySnapshots(
  supabase: SupabaseClient,
  metricKeys: string[],
  campusId?: string | null,
  canViewFinancial = false
): Promise<MetricSnapshot[]> {
  if (metricKeys.length === 0) return [];

  let monthlySnapshots = await getSectionCardMonthlySnapshots(
    supabase,
    metricKeys,
    campusId ?? undefined
  );

  if (canViewFinancial) {
    const stewardshipKeys = STEWARDSHIP_MONTHLY_METRICS.filter((key) =>
      metricKeys.includes(key)
    );
    if (stewardshipKeys.length > 0) {
      const stewardship = await getSectionCardMonthlySnapshots(
        supabase,
        [...stewardshipKeys],
        campusId ?? undefined
      );
      monthlySnapshots = mergeSnapshotSets(
        monthlySnapshots,
        stewardship,
        stewardshipKeys
      );
    }
  }

  return monthlySnapshots;
}

export async function getDashboardData(
  supabase: SupabaseClient,
  options: {
    campusId?: string | null;
    section: ViewSection;
    canViewFinancial: boolean;
  }
) {
  const allMetrics = await getMetrics(supabase);
  const metrics = filterMetricsForSection(
    allMetrics,
    options.section,
    options.canViewFinancial
  );
  const metricKeys = metrics.map((metric) => metric.key);

  const monthlySnapshots = await getSectionMonthlySnapshots(
    supabase,
    metricKeys,
    options.campusId ?? undefined,
    options.canViewFinancial
  );

  const targets = await getBenchmarkTargets(
    supabase,
    TARGET_FISCAL_YEAR,
    options.campusId ?? undefined
  );

  let attendanceTrend: AttendanceMonthlyTrendPoint[] = [];
  if (sectionShowsAttendanceTrend(options.section)) {
    attendanceTrend = await getAttendanceMonthlyTrend(
      supabase,
      options.campusId ?? undefined
    );
  }

  let monthlyGiving: MetricSnapshot[] = [];
  if (
    options.canViewFinancial &&
    metrics.some((m) => m.key === "giving_previous_month")
  ) {
    monthlyGiving = await getGivingPreviousMonthSnapshots(
      supabase,
      options.campusId ?? undefined
    );
  }

  return {
    metrics,
    monthlySnapshots,
    targets,
    attendanceTrend,
    monthlyGiving,
  };
}

export function buildCardPeriodValuesForMetric(
  monthlySnapshots: MetricSnapshot[],
  monthlyGiving: MetricSnapshot[],
  metricKey: string,
  campusId: string | null
): Record<CardPeriodRange, number | null> {
  if (metricKey === "giving_previous_month") {
    const value = getLatestMonthlyValue(monthlyGiving, metricKey, campusId);
    return {
      "this-month": null,
      "previous-month": value,
      "last-3-months": null,
      "last-12-months": null,
    };
  }

  return buildMetricCardPeriodValues(
    monthlySnapshots,
    metricKey,
    campusId
  );
}

export function buildBuiltInConcerns(
  snapshots: MetricSnapshot[],
  campuses: Campus[]
): Concern[] {
  const concerns: Concern[] = [];

  const stj = campuses.find((c) => c.slug === "st-johns");
  const alma = campuses.find((c) => c.slug === "alma");

  if (stj) {
    const retention = snapshots.find(
      (s) =>
        s.campus_id === stj.id && s.metric?.key === "retention_1st_to_2nd"
    );
    if (retention && retention.value <= 30) {
      concerns.push({
        id: "stj-retention",
        severity: "critical",
        title: "St. Johns giver retention collapsed",
        message: `1st→2nd gift retention is at ${retention.value}% — down sharply from prior year. This is the most urgent item in the benchmark data.`,
      });
    }
  }

  if (alma) {
    const kitRate = snapshots.find(
      (s) => s.campus_id === alma.id && s.metric?.key === "kit_conversion_rate"
    );
    if (kitRate && kitRate.value < 15) {
      concerns.push({
        id: "alma-conversion",
        severity: "warning",
        title: "Alma conversion gap",
        message: `Guest-to-kit conversion is ${kitRate.value}% — guests are growing but discipleship conversion is lagging.`,
      });
    }
  }

  const totalGuests = snapshots
    .filter((s) => s.metric?.key === "first_time_guests")
    .reduce((sum, s) => sum + s.value, 0);
  const totalNewGivers = snapshots
    .filter((s) => s.metric?.key === "new_giving_households")
    .reduce((sum, s) => sum + s.value, 0);

  if (totalGuests > 800 && totalNewGivers < 250) {
    concerns.push({
      id: "pipeline-gap",
      severity: "warning",
      title: "Guest-to-giver pipeline gap",
      message: `${totalGuests.toLocaleString()} first-time guests but only ${totalNewGivers} new giving households — the path from guest to stewardship needs attention.`,
    });
  }

  return concerns.slice(0, 3);
}

export async function evaluateAlertThresholds(
  supabase: SupabaseClient,
  snapshots: MetricSnapshot[]
): Promise<Concern[]> {
  const thresholds = await getAlertThresholds(supabase);
  const concerns: Concern[] = [];

  for (const threshold of thresholds) {
    const metricKey = threshold.metric?.key;
    if (!metricKey) continue;

    const relevant = snapshots.filter(
      (s) =>
        s.metric?.key === metricKey &&
        (threshold.campus_id
          ? s.campus_id === threshold.campus_id
          : true)
    );

    if (relevant.length === 0) continue;

    const value = relevant[0].value;
    const campusName = threshold.campus?.name ?? "Church-wide";

    if (metricKey === "retention_1st_to_2nd" && value < 50) {
      concerns.push({
        id: threshold.id,
        severity: value < 35 ? "critical" : "warning",
        title: threshold.label ?? "Retention alert",
        message: `${campusName}: ${threshold.metric?.label} is ${value}% — below the ${threshold.drop_percent}% concern threshold.`,
      });
    }

    if (metricKey === "kit_conversion_rate" && value < threshold.drop_percent) {
      concerns.push({
        id: threshold.id,
        severity: "warning",
        title: threshold.label ?? "Conversion alert",
        message: `${campusName}: ${threshold.metric?.label} is ${value}% — below ${threshold.drop_percent}% threshold.`,
      });
    }
  }

  return concerns;
}
