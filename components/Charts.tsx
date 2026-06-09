"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricSnapshot } from "@/lib/types";

type TrendChartProps = {
  data: MetricSnapshot[];
  title: string;
};

export function TrendChart({ data, title }: TrendChartProps) {
  const chartData = data.map((d) => ({
    label: new Date(d.period_start).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
    value: d.value,
    campus: d.campus?.name ?? "Campus",
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
        <h3 className="card-title text-base">{title}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="oklch(var(--p))"
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

type CampusCompareChartProps = {
  data: { campus: string; value: number }[];
  title: string;
  unit?: string;
};

export function CampusCompareChart({
  data,
  title,
}: CampusCompareChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body">
        <h3 className="card-title text-base">{title}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="campus" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="oklch(var(--p))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
