import type { MetricSnapshot } from "./types";
import { DEFAULT_FISCAL_YEAR, LAST_FISCAL_YEAR } from "./types";

export type PeriodRange =
  | "fiscal-year"
  | "last-fiscal-year"
  | "calendar-year"
  | "this-month"
  | "previous-month"
  | "last-3-months";

export const PERIOD_RANGES: PeriodRange[] = [
  "fiscal-year",
  "last-fiscal-year",
  "calendar-year",
  "this-month",
  "previous-month",
  "last-3-months",
];

export const PERIOD_LABELS: Record<PeriodRange, string> = {
  "fiscal-year": "Full fiscal year",
  "last-fiscal-year": "Last fiscal year",
  "calendar-year": "Calendar year",
  "this-month": "This month",
  "previous-month": "Previous month",
  "last-3-months": "Last 3 months",
};

export const CALENDAR_YEAR = 2025;

const LEGACY_YEAR_MAP: Record<string, PeriodRange> = {
  fiscal: "fiscal-year",
  calendar: "calendar-year",
};

export function parsePeriodRange(
  periodRaw?: string,
  yearRaw?: string
): PeriodRange {
  if (periodRaw && PERIOD_RANGES.includes(periodRaw as PeriodRange)) {
    return periodRaw as PeriodRange;
  }
  if (yearRaw && yearRaw in LEGACY_YEAR_MAP) {
    return LEGACY_YEAR_MAP[yearRaw];
  }
  return "fiscal-year";
}

export function isAnnualPeriod(period: PeriodRange): boolean {
  return (
    period === "fiscal-year" ||
    period === "last-fiscal-year" ||
    period === "calendar-year"
  );
}

export function fiscalYearForPeriod(period: PeriodRange): string | null {
  if (period === "fiscal-year") return DEFAULT_FISCAL_YEAR;
  if (period === "last-fiscal-year") return LAST_FISCAL_YEAR;
  return null;
}

export function getFiscalYearMonthlyBounds(fiscalYear: string): {
  start: string;
  end: string;
} {
  const startYear = Number(`20${fiscalYear.slice(2, 4)}`);
  return {
    start: `${startYear}-05-01`,
    end: `${startYear + 1}-04-01`,
  };
}

export function getCurrentFiscalYear(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const startYear = referenceDate.getMonth() >= 4 ? year : year - 1;
  const startYy = String(startYear).slice(-2);
  const endYy = String(startYear + 1).slice(-2);
  return `FY${startYy}/${endYy}`;
}

export function getFiscalYearYtdMonthEnd(
  fiscalYear: string,
  referenceDate = new Date()
): string | null {
  const { start, end } = getFiscalYearMonthlyBounds(fiscalYear);
  const previousMonth = getPreviousCalendarMonthStart(referenceDate);

  if (previousMonth < start) return null;

  const lastFyMonth = padMonth(
    new Date(
      new Date(`${end}T12:00:00`).getFullYear(),
      new Date(`${end}T12:00:00`).getMonth() - 1,
      1
    )
  );

  return previousMonth > lastFyMonth ? lastFyMonth : previousMonth;
}

/**
 * Months complete in the fiscal year through a specific month (inclusive).
 * Use when actuals are already positioned on the as-of month (e.g. July = 3 months in).
 */
export function getFiscalYearMonthsElapsedThroughMonth(
  fiscalYear: string,
  throughMonthStart: Date
): number {
  const { start, end } = getFiscalYearMonthlyBounds(fiscalYear);
  const throughMonth = padMonth(throughMonthStart);

  if (throughMonth < start) return 0;

  const lastFyMonth = padMonth(
    new Date(
      new Date(`${end}T12:00:00`).getFullYear(),
      new Date(`${end}T12:00:00`).getMonth() - 1,
      1
    )
  );
  const ytdEnd = throughMonth > lastFyMonth ? lastFyMonth : throughMonth;

  let count = 0;
  let cursor = new Date(`${start}T12:00:00`);
  const endCursor = new Date(`${ytdEnd}T12:00:00`);

  while (cursor <= endCursor) {
    count += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return count;
}

export function getFiscalYearPercentElapsedThroughMonth(
  fiscalYear: string,
  throughMonthStart: Date
): number {
  return (getFiscalYearMonthsElapsedThroughMonth(fiscalYear, throughMonthStart) / 12) * 100;
}

export function getFiscalYearMonthsElapsed(
  fiscalYear: string,
  referenceDate = new Date()
): number {
  const { start } = getFiscalYearMonthlyBounds(fiscalYear);
  const ytdEnd = getFiscalYearYtdMonthEnd(fiscalYear, referenceDate);

  if (!ytdEnd) return 0;

  let count = 0;
  let cursor = new Date(`${start}T12:00:00`);
  const endCursor = new Date(`${ytdEnd}T12:00:00`);

  while (cursor <= endCursor) {
    count += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return count;
}

export function getFiscalYearPercentElapsed(
  fiscalYear: string,
  referenceDate = new Date()
): number {
  return (getFiscalYearMonthsElapsed(fiscalYear, referenceDate) / 12) * 100;
}

export function getPreviousCalendarMonthStart(
  referenceDate = new Date()
): string {
  return padMonth(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1)
  );
}

/** Month/year label for financial reporting (e.g. "July 2026"). */
export function formatMonthYearLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

/**
 * Expense actuals are posted through the end of the prior month.
 * When the active workbook tab is the current month, use the previous month.
 * Historical month tabs represent data through that month.
 */
export function getFinancialsAsOfMonthStart(
  selectedPeriodId: string,
  referenceDate = new Date()
): Date {
  if (selectedPeriodId !== "ytd") {
    const periodStart = new Date(`${selectedPeriodId}T12:00:00`);
    if (!Number.isNaN(periodStart.getTime())) {
      const isCurrentMonthTab =
        periodStart.getFullYear() === referenceDate.getFullYear() &&
        periodStart.getMonth() === referenceDate.getMonth();

      if (isCurrentMonthTab) {
        return new Date(
          referenceDate.getFullYear(),
          referenceDate.getMonth() - 1,
          1
        );
      }

      return periodStart;
    }
  }

  return new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
}

export function getFinancialsAsOfLabel(
  selectedPeriodId: string,
  referenceDate = new Date()
): string {
  return formatMonthYearLabel(
    getFinancialsAsOfMonthStart(selectedPeriodId, referenceDate)
  );
}

/** Last day of the financials-as-of month (for FY pace calculations). */
export function getFinancialsReferenceDate(
  selectedPeriodId: string,
  referenceDate = new Date()
): Date {
  const asOfMonth = getFinancialsAsOfMonthStart(selectedPeriodId, referenceDate);
  return new Date(asOfMonth.getFullYear(), asOfMonth.getMonth() + 1, 0, 12, 0, 0);
}

export function isMonthlyPeriod(period: PeriodRange): boolean {
  return !isAnnualPeriod(period);
}

function padMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function getPeriodDescription(
  period: PeriodRange,
  referenceDate = new Date()
): string {
  switch (period) {
    case "fiscal-year":
      return `${DEFAULT_FISCAL_YEAR} (May–Apr)`;
    case "last-fiscal-year":
      return `${LAST_FISCAL_YEAR} (May–Apr)`;
    case "calendar-year":
      return `Calendar year ${CALENDAR_YEAR}`;
    case "this-month":
      return formatMonthYear(referenceDate);
    case "previous-month": {
      const prev = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() - 1,
        1
      );
      return formatMonthYear(prev);
    }
    case "last-3-months": {
      const start = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() - 2,
        1
      );
      return `${formatMonthYear(start)} – ${formatMonthYear(referenceDate)}`;
    }
  }
}

export function getMonthlyPeriodBounds(
  period: PeriodRange,
  referenceDate = new Date()
): { start: string; end: string } | null {
  if (isAnnualPeriod(period)) return null;

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (period === "this-month") {
    const start = padMonth(new Date(year, month, 1));
    return { start, end: start };
  }

  if (period === "previous-month") {
    const start = padMonth(new Date(year, month - 1, 1));
    return { start, end: start };
  }

  const start = padMonth(new Date(year, month - 2, 1));
  const end = padMonth(new Date(year, month, 1));
  return { start, end };
}

export function aggregateMonthlySnapshots(
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

  if (campusId || matches.length === 1) {
    const unit = matches[0].metric?.unit;
    if (unit === "percent") {
      return (
        matches.reduce((sum, row) => sum + row.value, 0) / matches.length
      );
    }
    return matches.reduce((sum, row) => sum + row.value, 0);
  }

  const unit = matches[0].metric?.unit;
  const byCampus = new Map<string, MetricSnapshot[]>();
  for (const row of matches) {
    if (!row.campus_id) continue;
    const list = byCampus.get(row.campus_id) ?? [];
    list.push(row);
    byCampus.set(row.campus_id, list);
  }

  if (byCampus.size === 0) {
    if (unit === "percent") {
      return (
        matches.reduce((sum, row) => sum + row.value, 0) / matches.length
      );
    }
    return matches.reduce((sum, row) => sum + row.value, 0);
  }

  const campusTotals = [...byCampus.values()].map((rows) => {
    if (unit === "percent") {
      return rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
    }
    return rows.reduce((sum, row) => sum + row.value, 0);
  });

  if (unit === "percent") {
    return (
      campusTotals.reduce((sum, value) => sum + value, 0) / campusTotals.length
    );
  }
  return campusTotals.reduce((sum, value) => sum + value, 0);
}

export function collapseMonthlyToSnapshots(
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
    const unit = sample.metric?.unit;
    const value =
      unit === "percent"
        ? rows.reduce((sum, row) => sum + row.value, 0) / rows.length
        : rows.reduce((sum, row) => sum + row.value, 0);

    return {
      ...sample,
      value,
      period_start: rows[rows.length - 1].period_start,
    };
  });
}
