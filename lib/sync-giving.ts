import {
  CAMPUS_ORDER,
  fetchParsedGivingData,
  type GivingCampusSlug,
  type ParsedGivingMonth,
} from "./google-sheets-giving";
import { createAdminClient } from "./supabase/admin";

const STEWARDSHIP_METRIC_KEYS = [
  "total_giving",
  "giving_previous_month",
  "giving_households",
  "general_fund_expenses",
] as const;

type StewardshipMetricKey = (typeof STEWARDSHIP_METRIC_KEYS)[number];

type SnapshotInsert = {
  campus_id: string | null;
  metric_id: string;
  period_start: string;
  period_type: "monthly";
  fiscal_year: string | null;
  calendar_year: number | null;
  value: number;
  source: string;
};

type SyncGivingResult = {
  monthCount: number;
  snapshotCount: number;
  dateRange: { start: string; end: string } | null;
};

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function roundCount(value: number): number {
  return Math.round(value);
}

function buildSnapshotRows(
  month: ParsedGivingMonth,
  metricIds: Record<StewardshipMetricKey, string>,
  campusIds: Record<GivingCampusSlug, string>
): SnapshotInsert[] {
  const rows: SnapshotInsert[] = [];
  const source = "google_sheets";

  if (month.totalGiving !== null) {
    rows.push({
      campus_id: null,
      metric_id: metricIds.total_giving,
      period_start: month.periodStart,
      period_type: "monthly",
      fiscal_year: null,
      calendar_year: null,
      value: roundCurrency(month.totalGiving),
      source,
    });
    rows.push({
      campus_id: null,
      metric_id: metricIds.giving_previous_month,
      period_start: month.periodStart,
      period_type: "monthly",
      fiscal_year: null,
      calendar_year: null,
      value: roundCurrency(month.totalGiving),
      source,
    });
  }

  if (month.givers !== null) {
    rows.push({
      campus_id: null,
      metric_id: metricIds.giving_households,
      period_start: month.periodStart,
      period_type: "monthly",
      fiscal_year: null,
      calendar_year: null,
      value: roundCount(month.givers),
      source,
    });
  }

  if (month.expenses !== null) {
    rows.push({
      campus_id: null,
      metric_id: metricIds.general_fund_expenses,
      period_start: month.periodStart,
      period_type: "monthly",
      fiscal_year: null,
      calendar_year: null,
      value: roundCurrency(month.expenses),
      source,
    });
  }

  for (const slug of CAMPUS_ORDER) {
    const campus = month.campuses[slug];
    if (!campus) continue;

    rows.push({
      campus_id: campusIds[slug],
      metric_id: metricIds.total_giving,
      period_start: month.periodStart,
      period_type: "monthly",
      fiscal_year: null,
      calendar_year: null,
      value: roundCurrency(campus.giving),
      source,
    });
  }

  return rows;
}

export async function syncGivingFromGoogleSheets(): Promise<SyncGivingResult> {
  const months = await fetchParsedGivingData();
  const supabase = createAdminClient();

  const [{ data: metrics }, { data: campuses }] = await Promise.all([
    supabase
      .from("metrics")
      .select("id, key")
      .in("key", STEWARDSHIP_METRIC_KEYS),
    supabase.from("campuses").select("id, slug"),
  ]);

  if (!metrics?.length || !campuses?.length) {
    throw new Error("Missing stewardship metrics or campuses in the database.");
  }

  const metricIds = Object.fromEntries(
    metrics.map((metric) => [metric.key, metric.id])
  ) as Record<StewardshipMetricKey, string>;

  const campusIds = Object.fromEntries(
    campuses.map((campus) => [campus.slug, campus.id])
  ) as Record<GivingCampusSlug, string>;

  const metricIdList = metrics.map((metric) => metric.id);
  const monthStarts = months.map((month) => month.periodStart);

  if (monthStarts.length > 0) {
    const { error: deleteError } = await supabase
      .from("metric_snapshots")
      .delete()
      .in("metric_id", metricIdList)
      .eq("period_type", "monthly")
      .in("period_start", monthStarts);

    if (deleteError) {
      throw new Error(
        `Failed to clear monthly stewardship snapshots: ${deleteError.message}`
      );
    }
  }

  const inserts = months.flatMap((month) =>
    buildSnapshotRows(month, metricIds, campusIds)
  );

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from("metric_snapshots")
      .insert(inserts);

    if (insertError) {
      throw new Error(
        `Failed to insert stewardship snapshots: ${insertError.message}`
      );
    }
  }

  return {
    monthCount: months.length,
    snapshotCount: inserts.length,
    dateRange:
      months.length > 0
        ? {
            start: months[0].periodStart,
            end: months[months.length - 1].periodStart,
          }
        : null,
  };
}
