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
import {
  GIVING_CAMPUS_CHART_SERIES,
  type AttendanceMonthlyTrendPoint,
  type GivingMonthlyTrendPoint,
  type GivingVsExpensesPoint,
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
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-base">{title}</h3>
          <p className="text-sm text-base-content/60">No trend data yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body">
        <div>
          <h3 className="card-title text-base">{title}</h3>
          {subtitle && (
            <p className="text-sm text-base-content/60">{subtitle}</p>
          )}
        </div>
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
                stroke="oklch(0.52 0.12 250)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
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
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body">
        <div>
          <h3 className="card-title text-base">{title}</h3>
          {subtitle && (
            <p className="text-sm text-base-content/60">{subtitle}</p>
          )}
        </div>
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
                fill="oklch(0.52 0.12 250)"
                radius={[4, 4, 0, 0]}
              />
              {hasComparison && (
                <Bar
                  dataKey="comparison"
                  name={comparisonLabel}
                  fill="oklch(0.52 0.17 25)"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
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
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-base">{title}</h3>
          <p className="text-sm text-base-content/60">
            No giving data yet for the last 12 months.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body">
        <div>
          <h3 className="card-title text-base">{title}</h3>
          {subtitle && (
            <p className="text-sm text-base-content/60">{subtitle}</p>
          )}
        </div>
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
      </div>
    </div>
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
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-base">{title}</h3>
          <p className="text-sm text-base-content/60">
            No giving or expense data yet for the last 12 months.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body">
        <div>
          <h3 className="card-title text-base">{title}</h3>
          {subtitle && (
            <p className="text-sm text-base-content/60">{subtitle}</p>
          )}
          {latest && (
            <p className="text-sm text-base-content/70 mt-1">
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
        </div>
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
      </div>
    </div>
  );
}
