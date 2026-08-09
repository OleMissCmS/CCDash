import type { MetricSnapshot } from "./types";
import { getMonthlyPeriodBounds, type PeriodRange } from "./periods";

export type CardPeriodRange =
  | "this-month"
  | "previous-month"
  | "last-3-months"
  | "last-12-months";

export const CARD_PERIOD_RANGES: CardPeriodRange[] = [
  "this-month",
  "previous-month",
  "last-3-months",
  "last-12-months",
];

export const CARD_PERIOD_LABELS: Record<CardPeriodRange, string> = {
  "this-month": "This month",
  "previous-month": "Last month",
  "last-3-months": "Last 3 months",
  "last-12-months": "Last 12 months avg",
};

const AVERAGE_CARD_METRIC_KEYS = new Set([
  "total_in_person_avg",
  "adult_worship_avg",
  "kids_avg",
  "students_avg",
  "giving_households",
]);

const FIXED_PERIOD_METRIC_KEYS = new Set([
  "giving_previous_month",
  "last_week_attendance",
]);

function padMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function supportsCardPeriodSelect(metricKey: string): boolean {
  return !FIXED_PERIOD_METRIC_KEYS.has(metricKey);
}

export function defaultCardPeriod(metricKey: string, unit?: string): CardPeriodRange {
  if (metricKey === "giving_previous_month") return "previous-month";
  if (
    AVERAGE_CARD_METRIC_KEYS.has(metricKey) ||
    unit === "percent" ||
    metricKey.endsWith("_rate")
  ) {
    return "last-12-months";
  }
  return "this-month";
}

export function showBenchmarkForCardPeriod(period: CardPeriodRange): boolean {
  return period === "last-12-months";
}

export function getCardPeriodBounds(
  period: CardPeriodRange,
  referenceDate = new Date()
): { start: string; end: string } {
  if (period === "last-12-months") {
    const end = padMonth(
      new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
    );
    const start = padMonth(
      new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 11, 1)
    );
    return { start, end };
  }

  const bounds = getMonthlyPeriodBounds(period as PeriodRange, referenceDate);
  if (!bounds) {
    throw new Error(`Unsupported card period: ${period}`);
  }
  return bounds;
}

export function getCardPeriodLabel(
  period: CardPeriodRange,
  metricKey: string,
  unit?: string
): string {
  if (
    period === "last-12-months" &&
    !metricUsesMonthlyAverage(metricKey, unit)
  ) {
    return "Last 12 months total";
  }
  return CARD_PERIOD_LABELS[period];
}

export function getCardPeriodDescription(
  period: CardPeriodRange,
  metricKey?: string,
  unit?: string
): string {
  if (metricKey) {
    return getCardPeriodLabel(period, metricKey, unit);
  }
  return CARD_PERIOD_LABELS[period];
}

function metricUsesMonthlyAverage(metricKey: string, unit?: string): boolean {
  return (
    AVERAGE_CARD_METRIC_KEYS.has(metricKey) ||
    unit === "percent" ||
    metricKey.endsWith("_rate")
  );
}

function churchWideValueForMonth(
  monthRows: MetricSnapshot[],
  campusId: string | null
): number | null {
  if (campusId) {
    return monthRows.find((row) => row.campus_id === campusId)?.value ?? null;
  }

  const churchWide = monthRows.find((row) => row.campus_id == null);
  if (churchWide) return churchWide.value;

  const campusRows = monthRows.filter((row) => row.campus_id != null);
  if (campusRows.length === 0) {
    return monthRows[0]?.value ?? null;
  }

  const unit = monthRows[0]?.metric?.unit;
  if (unit === "percent") {
    return (
      campusRows.reduce((sum, row) => sum + row.value, 0) / campusRows.length
    );
  }

  return campusRows.reduce((sum, row) => sum + row.value, 0);
}

export function getMetricValueForCardPeriod(
  monthlySnapshots: MetricSnapshot[],
  metricKey: string,
  period: CardPeriodRange,
  campusId: string | null
): number | null {
  const bounds = getCardPeriodBounds(period);
  const matches = monthlySnapshots.filter(
    (row) =>
      row.metric?.key === metricKey &&
      row.period_start >= bounds.start &&
      row.period_start <= bounds.end
  );

  if (matches.length === 0) return null;

  const byMonth = new Map<string, MetricSnapshot[]>();
  for (const row of matches) {
    const list = byMonth.get(row.period_start) ?? [];
    list.push(row);
    byMonth.set(row.period_start, list);
  }

  const monthlyValues = [...byMonth.values()]
    .map((monthRows) => churchWideValueForMonth(monthRows, campusId))
    .filter((value): value is number => value != null);

  if (monthlyValues.length === 0) return null;

  const unit = matches[0].metric?.unit;
  if (metricUsesMonthlyAverage(metricKey, unit)) {
    return (
      monthlyValues.reduce((sum, value) => sum + value, 0) /
      monthlyValues.length
    );
  }

  return monthlyValues.reduce((sum, value) => sum + value, 0);
}

export function buildMetricCardPeriodValues(
  monthlySnapshots: MetricSnapshot[],
  metricKey: string,
  campusId: string | null
): Record<CardPeriodRange, number | null> {
  return Object.fromEntries(
    CARD_PERIOD_RANGES.map((period) => [
      period,
      getMetricValueForCardPeriod(
        monthlySnapshots,
        metricKey,
        period,
        campusId
      ),
    ])
  ) as Record<CardPeriodRange, number | null>;
}
