"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatValue } from "@/lib/format";
import { SfdcWidget } from "@/components/sfdc/SfdcWidget";
import {
  ATTENDANCE_CALENDAR_YEAR_SERIES,
  GIVING_CAMPUS_CHART_SERIES,
  KIDS_CALENDAR_YEAR_SERIES,
  type AttendanceCalendarYearTrendPoint,
  type AttendanceMonthlyTrendPoint,
  type GivingMonthlyTrendPoint,
  type GivingVsExpensesPoint,
  type KidsCalendarYearTrendPoint,
} from "@/lib/metrics";
import type { MetricSnapshot } from "@/lib/types";

type TrendChartProps = {
  data: AttendanceMonthlyTrendPoint[];
  title: string;
  subtitle?: string;
};

export function TrendChart({ data, title, subtitle }: TrendChartProps) {
  const chartData = data.map((point) => ({
    label: new Date(`${point.periodStart}T12:00:00`).toLocaleDateString(
      "en-US",
      {
        month: "short",
        year: "2-digit",
      }
    ),
    value: point.value,
  }));

  if (chartData.length === 0) {
    return (
      <SfdcWidget title={title}>
        <p className="text-sm text-base-content/60">No trend data yet.</p>
      </SfdcWidget>
    );
  }

  return (
    <SfdcWidget title={title}>
      {subtitle && (
        <p className="sfdc-metric-subtitle mb-3 -mt-1">{subtitle}</p>
      )}
      <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatValue(Number(value), "people")}
                width={56}
              />
              <Tooltip
                formatter={(value) => [
                  formatValue(Number(value), "people"),
                  "Avg attendance",
                ]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Avg attendance"
                stroke="var(--sfdc-brand)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
    </SfdcWidget>
  );
}

type CalendarYearTrendChartProps = {
  data: AttendanceCalendarYearTrendPoint[];
  title: string;
  subtitle?: string;
  series: ReadonlyArray<{
    year: number;
    label: string;
    color: string;
  }>;
  emptyMessage: string;
};

function CalendarYearTrendChart({
  data,
  title,
  subtitle,
  series,
  emptyMessage,
}: CalendarYearTrendChartProps) {
  const activeYears = series.filter((yearSeries) =>
    data.some((point) => point.byYear[yearSeries.year] != null)
  );

  const chartData = data.map((point) => {
    const row: Record<string, string | number | null> = {
      label: point.label,
    };

    for (const yearSeries of series) {
      row[String(yearSeries.year)] = point.byYear[yearSeries.year] ?? null;
    }

    return row;
  });

  if (activeYears.length === 0) {
    return (
      <SfdcWidget title={title}>
        <p className="text-sm text-base-content/60">{emptyMessage}</p>
      </SfdcWidget>
    );
  }

  return (
    <SfdcWidget title={title}>
      {subtitle && (
        <p className="sfdc-metric-subtitle mb-3 -mt-1">{subtitle}</p>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatValue(Number(value), "people")}
              width={56}
            />
            <Tooltip
              formatter={(value, name) => [
                value == null ? "—" : formatValue(Number(value), "people"),
                name,
              ]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend />
            {activeYears.map((series) => {
              const isCurrent =
                series.year === Math.max(...activeYears.map((item) => item.year));
              return (
                <Line
                  key={series.year}
                  type="monotone"
                  dataKey={String(series.year)}
                  name={isCurrent ? `${series.label} (current)` : series.label}
                  stroke={isCurrent ? "#032d60" : series.color}
                  strokeWidth={isCurrent ? 4 : 2}
                  strokeOpacity={isCurrent ? 1 : 0.7}
                  dot={{
                    r: isCurrent ? 5 : 3,
                    strokeWidth: 2,
                    fill: isCurrent ? "#032d60" : series.color,
                  }}
                  activeDot={{ r: isCurrent ? 7 : 5 }}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SfdcWidget>
  );
}

type AttendanceCalendarYearTrendChartProps = {
  data: AttendanceCalendarYearTrendPoint[];
  title: string;
  subtitle?: string;
};

export function AttendanceCalendarYearTrendChart({
  data,
  title,
  subtitle,
}: AttendanceCalendarYearTrendChartProps) {
  return (
    <CalendarYearTrendChart
      data={data}
      title={title}
      subtitle={subtitle}
      series={ATTENDANCE_CALENDAR_YEAR_SERIES}
      emptyMessage="No attendance data yet."
    />
  );
}

type AttendanceLinearRegressionChartProps = {
  data: AttendanceCalendarYearTrendPoint[];
  title: string;
  subtitle?: string;
};

function chronologicalAttendancePoints(
  data: AttendanceCalendarYearTrendPoint[]
): { label: string; value: number }[] {
  const years = [
    ...new Set(data.flatMap((point) => Object.keys(point.byYear).map(Number))),
  ].sort((a, b) => a - b);

  const points: { label: string; value: number }[] = [];
  for (const year of years) {
    for (const point of data) {
      const value = point.byYear[year];
      if (value == null) continue;
      points.push({
        label: `${point.label} ${String(year).slice(2)}`,
        value,
      });
    }
  }

  return points;
}

function fitAttendanceRegression(values: number[]) {
  const count = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  values.forEach((value, index) => {
    sumX += index;
    sumY += value;
    sumXY += index * value;
    sumXX += index * index;
  });

  const denominator = count * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;
  const meanY = sumY / count;
  let residualSum = 0;
  let totalSum = 0;

  values.forEach((value, index) => {
    const predicted = intercept + slope * index;
    residualSum += (value - predicted) ** 2;
    totalSum += (value - meanY) ** 2;
  });

  const rSquared = totalSum === 0 ? 1 : 1 - residualSum / totalSum;
  return { slope, intercept, rSquared };
}

function formatSignedPeople(value: number, digits: number) {
  const rounded = Number(value.toFixed(digits));
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function AttendanceLinearRegressionChart({
  data,
  title,
  subtitle,
}: AttendanceLinearRegressionChartProps) {
  const observed = chronologicalAttendancePoints(data);
  const fit = fitAttendanceRegression(observed.map((point) => point.value));
  const chartData =
    fit == null
      ? []
      : observed.map((point, index) => ({
          label: point.label,
          attendance: point.value,
          regression: fit.intercept + fit.slope * index,
        }));

  if (chartData.length < 2 || fit == null) {
    return (
      <SfdcWidget title={title}>
        <p className="text-sm text-base-content/60">
          Not enough attendance data for a regression.
        </p>
      </SfdcWidget>
    );
  }

  const monthlySlope = formatSignedPeople(fit.slope, 1);
  const yearlySlope = formatSignedPeople(fit.slope * 12, 0);
  const rSquared = fit.rSquared.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

  return (
    <SfdcWidget title={title}>
      {subtitle && (
        <p className="sfdc-metric-subtitle mb-1 -mt-1">{subtitle}</p>
      )}
      <p className="sfdc-metric-subtitle mb-3">
        Trend: {monthlySlope} people per month ({yearlySlope} per year) · R²{" "}
        {rSquared}
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatValue(Number(value), "people")}
              width={56}
            />
            <Tooltip
              formatter={(value, name) => [
                value == null ? "—" : formatValue(Number(value), "people"),
                name,
              ]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="attendance"
              name="Monthly average"
              stroke="var(--sfdc-brand)"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="regression"
              name="Linear regression"
              stroke="#032d60"
              strokeWidth={3}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SfdcWidget>
  );
}

type KidsCalendarYearTrendChartProps = {
  data: KidsCalendarYearTrendPoint[];
  title: string;
  subtitle?: string;
};

export function KidsCalendarYearTrendChart({
  data,
  title,
  subtitle,
}: KidsCalendarYearTrendChartProps) {
  return (
    <CalendarYearTrendChart
      data={data}
      title={title}
      subtitle={subtitle}
      series={KIDS_CALENDAR_YEAR_SERIES}
      emptyMessage="No kids attendance data yet."
    />
  );
}

type CampusCompareDataPoint = {
  campus: string;
  value: number;
  comparison?: number | null;
};

type CampusCompareChartProps = {
  data: CampusCompareDataPoint[];
  title: string;
  subtitle?: string;
  unit?: string;
  valueLabel?: string;
  comparisonLabel?: string;
};

export function CampusCompareChart({
  data,
  title,
  subtitle,
  unit = "people",
  valueLabel = "Value",
  comparisonLabel = "Comparison",
}: CampusCompareChartProps) {
  if (data.length === 0) return null;

  const hasComparison = data.some((point) => point.comparison != null);
  const chartData = data.map((point) => ({
    campus: point.campus,
    value: point.value,
    comparison: point.comparison ?? undefined,
  }));

  return (
    <SfdcWidget title={title}>
      {subtitle && (
        <p className="sfdc-metric-subtitle mb-3 -mt-1">{subtitle}</p>
      )}
      <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="campus" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatValue(Number(value), unit)}
                width={56}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatValue(Number(value), unit),
                  name,
                ]}
              />
              {hasComparison && <Legend />}
              <Bar
                dataKey="value"
                name={valueLabel}
                fill="var(--sfdc-brand)"
                radius={[4, 4, 0, 0]}
              />
              {hasComparison && (
                <Bar
                  dataKey="comparison"
                  name={comparisonLabel}
                  fill="#fe9339"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
    </SfdcWidget>
  );
}

type GivingMonthlyChartProps = {
  data: GivingMonthlyTrendPoint[];
  title: string;
  subtitle?: string;
};

export function GivingMonthlyChart({
  data,
  title,
  subtitle,
}: GivingMonthlyChartProps) {
  const chartData = data.map((point) => {
    const row: Record<string, string | number> = {
      label: new Date(`${point.periodStart}T12:00:00`).toLocaleDateString(
        "en-US",
        { month: "short", year: "2-digit" }
      ),
      total: point.total,
    };

    for (const campus of GIVING_CAMPUS_CHART_SERIES) {
      row[campus.label] = point.campuses[campus.slug];
    }

    return row;
  });

  if (chartData.length === 0) {
    return (
      <SfdcWidget title={title}>
        <p className="text-sm text-base-content/60">
          No giving data yet for the current fiscal year.
        </p>
      </SfdcWidget>
    );
  }

  return (
    <SfdcWidget title={title}>
      {subtitle && (
        <p className="sfdc-metric-subtitle mb-3 -mt-1">{subtitle}</p>
      )}
      <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatValue(Number(value), "currency")}
                width={72}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatValue(Number(value), "currency"),
                  name,
                ]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend />
              {GIVING_CAMPUS_CHART_SERIES.map((campus) => (
                <Bar
                  key={campus.slug}
                  dataKey={campus.label}
                  name={campus.label}
                  stackId="giving"
                  fill={campus.color}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
    </SfdcWidget>
  );
}

type GivingVsExpensesChartProps = {
  data: GivingVsExpensesPoint[];
  title: string;
  subtitle?: string;
};

export function GivingVsExpensesChart({
  data,
  title,
  subtitle,
}: GivingVsExpensesChartProps) {
  const chartData = data.map((point) => ({
    label: new Date(`${point.periodStart}T12:00:00`).toLocaleDateString(
      "en-US",
      { month: "short", year: "2-digit" }
    ),
    giving: point.giving,
    expenses: point.expenses,
    net: point.net,
  }));

  const latest = data[data.length - 1];

  if (chartData.length === 0) {
    return (
      <SfdcWidget title={title}>
        <p className="text-sm text-base-content/60">
          No giving or expense data yet for the current fiscal year.
        </p>
      </SfdcWidget>
    );
  }

  return (
    <SfdcWidget title={title}>
      {subtitle && (
        <p className="sfdc-metric-subtitle mb-2 -mt-1">{subtitle}</p>
      )}
      {latest && (
        <p className="text-sm text-base-content/70 mb-3">
          Latest month:{" "}
          <span className="font-medium text-success">
            {formatValue(latest.giving, "currency")} giving
          </span>
          {" · "}
          <span className="font-medium text-error">
            {formatValue(latest.expenses, "currency")} expenses
          </span>
          {" · "}
          <span
            className={
              latest.net >= 0 ? "font-medium text-success" : "font-medium text-error"
            }
          >
            {formatValue(latest.net, "currency")} net
          </span>
        </p>
      )}
      <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatValue(Number(value), "currency")}
                width={72}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatValue(Number(value), "currency"),
                  name,
                ]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend />
              <Bar
                dataKey="giving"
                name="Giving"
                fill="oklch(0.52 0.14 145)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="oklch(0.52 0.17 25)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
    </SfdcWidget>
  );
}
