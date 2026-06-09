import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AlertThreshold,
  BenchmarkTarget,
  Campus,
  Concern,
  Metric,
  MetricCategory,
  MetricSnapshot,
  UserProfile,
  YearMode,
} from "./types";
import { DEFAULT_FISCAL_YEAR, TARGET_FISCAL_YEAR } from "./types";

export async function getUserProfile(
  supabase: SupabaseClient
): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, display_name, role, financial_insights")
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

export async function getBaptisms(
  supabase: SupabaseClient,
  yearMode: YearMode,
  campusId?: string | null
): Promise<MetricSnapshot[]> {
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

  if (yearMode === "fiscal") {
    query = query.eq("fiscal_year", DEFAULT_FISCAL_YEAR);
  } else {
    query = query.eq("calendar_year", 2025).is("fiscal_year", null);
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

export function getSnapshotValue(
  snapshots: MetricSnapshot[],
  metricKey: string,
  campusId: string | null
): number | null {
  const matches = snapshots.filter(
    (s) =>
      s.metric?.key === metricKey &&
      (campusId ? s.campus_id === campusId : true)
  );
  if (matches.length === 0) return null;
  if (campusId || matches.length === 1) return matches[0].value;

  const unit = matches[0].metric?.unit;
  if (unit === "percent") {
    return matches.reduce((sum, s) => sum + s.value, 0) / matches.length;
  }
  return matches.reduce((sum, s) => sum + s.value, 0);
}

export function aggregateChurchWide(
  snapshots: MetricSnapshot[],
  metricKey: string
): number {
  const filtered = snapshots.filter((s) => s.metric?.key === metricKey);
  if (filtered.length === 0) return 0;

  const unit = filtered[0].metric?.unit;
  if (unit === "percent") {
    return filtered.reduce((sum, s) => sum + s.value, 0) / filtered.length;
  }
  return filtered.reduce((sum, s) => sum + s.value, 0);
}

export async function getDashboardData(
  supabase: SupabaseClient,
  options: {
    campusId?: string | null;
    category: MetricCategory;
    yearMode: YearMode;
  }
) {
  const metrics = await getMetrics(supabase, options.category);
  const snapshots = await getAnnualSnapshots(
    supabase,
    DEFAULT_FISCAL_YEAR,
    options.campusId ?? undefined
  );
  const targets = await getBenchmarkTargets(
    supabase,
    TARGET_FISCAL_YEAR,
    options.campusId ?? undefined
  );

  let trend: MetricSnapshot[] = [];
  if (options.category === "attendance") {
    trend = await getMonthlyTrend(
      supabase,
      "total_in_person_avg",
      options.campusId ?? undefined
    );
  }

  let baptisms: MetricSnapshot[] = [];
  if (options.category === "engagement") {
    baptisms = await getBaptisms(
      supabase,
      options.yearMode,
      options.campusId ?? undefined
    );
  }

  return { metrics, snapshots, targets, trend, baptisms };
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
