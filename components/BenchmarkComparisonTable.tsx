"use client";

import { useMemo, useState } from "react";
import { formatValue } from "@/lib/format";
import {
  findBenchmark,
  getStoplightStatus,
  metricsWhereHigherIsBetter,
  STATUS_SORT_ORDER,
  type StoplightResult,
  type StoplightStatus,
} from "@/lib/benchmarks";
import { getSnapshotValue } from "@/lib/metrics";
import type { BenchmarkTarget, Campus, MetricSnapshot } from "@/lib/types";
import { DEFAULT_FISCAL_YEAR } from "@/lib/types";
import { StoplightBadge } from "./Stoplight";

type BenchmarkRow = {
  rowKey: string;
  target: BenchmarkTarget;
  actual: number | null;
  stoplight: StoplightResult | null;
  campusLabel: string;
};

function sortStatusOrder(status: StoplightStatus | null): number {
  if (status === null) return 3;
  return STATUS_SORT_ORDER[status];
}

function buildRow(
  target: BenchmarkTarget,
  snapshots: MetricSnapshot[],
  campusLabel: string,
  rowKey: string,
  actualCampusId: string | null
): BenchmarkRow | null {
  if (!target.metric) return null;

  const actual = getSnapshotValue(
    snapshots,
    target.metric.key,
    actualCampusId
  );

  const stoplight =
    actual === null
      ? null
      : getStoplightStatus(
          actual,
          target.target_value,
          metricsWhereHigherIsBetter(target.metric.key)
        );

  return {
    rowKey,
    target,
    actual,
    stoplight,
    campusLabel,
  };
}

type SortColumn = "status" | "metric" | "campus";
type SortDirection = "asc" | "desc";

function compareCampusLabels(a: string, b: string): number {
  if (a === b) return 0;
  if (a === "Church-wide") return 1;
  if (b === "Church-wide") return -1;
  return a.localeCompare(b);
}

function compareRows(
  a: BenchmarkRow,
  b: BenchmarkRow,
  column: SortColumn,
  direction: SortDirection
): number {
  const multiplier = direction === "asc" ? 1 : -1;

  let primary = 0;
  switch (column) {
    case "status":
      primary =
        sortStatusOrder(a.stoplight?.status ?? null) -
        sortStatusOrder(b.stoplight?.status ?? null);
      if (primary !== 0) return primary * multiplier;
      primary = (a.target.metric?.label ?? "").localeCompare(
        b.target.metric?.label ?? ""
      );
      if (primary !== 0) return primary;
      return compareCampusLabels(a.campusLabel, b.campusLabel);
    case "metric":
      primary = (a.target.metric?.label ?? "").localeCompare(
        b.target.metric?.label ?? ""
      );
      if (primary !== 0) return primary * multiplier;
      return compareCampusLabels(a.campusLabel, b.campusLabel);
    case "campus":
      primary = compareCampusLabels(a.campusLabel, b.campusLabel);
      if (primary !== 0) return primary * multiplier;
      return (a.target.metric?.label ?? "").localeCompare(
        b.target.metric?.label ?? ""
      );
  }

  return 0;
}

type SortableHeaderProps = {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
};

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: SortableHeaderProps) {
  const isActive = activeColumn === column;

  return (
    <th>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-semibold hover:text-primary transition-colors"
        onClick={() => onSort(column)}
        aria-sort={
          isActive ? (direction === "asc" ? "ascending" : "descending") : "none"
        }
      >
        {label}
        {isActive && (
          <span className="text-primary" aria-hidden>
            {direction === "asc" ? "↑" : "↓"}
          </span>
        )}
      </button>
    </th>
  );
}

type BenchmarkComparisonTableProps = {
  targets: BenchmarkTarget[];
  snapshots: MetricSnapshot[];
  campuses: Campus[];
  campusId?: string | null;
};

export function BenchmarkComparisonTable({
  targets,
  snapshots,
  campuses,
  campusId = null,
}: BenchmarkComparisonTableProps) {
  const [campusFilter, setCampusFilter] = useState("all");
  const effectiveCampusFilter = campusId ?? campusFilter;
  const [sortColumn, setSortColumn] = useState<SortColumn>("status");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  const unsortedRows = useMemo(() => {
    const built: BenchmarkRow[] = [];
    const churchWideMetricKeys = new Set<string>();

    for (const target of targets) {
      if (!target.metric) continue;

      if (effectiveCampusFilter === "church-wide") {
        if (target.campus_id !== null) continue;
      } else if (
        effectiveCampusFilter !== "all" &&
        target.campus_id !== effectiveCampusFilter
      ) {
        continue;
      }

      if (target.campus_id === null) {
        churchWideMetricKeys.add(target.metric.key);
      }

      const row = buildRow(
        target,
        snapshots,
        target.campus?.name ?? "Church-wide",
        target.id,
        target.campus_id
      );
      if (row) built.push(row);
    }

    // Church-wide aggregate rows (matches KPI card logic when viewing all campuses)
    if (effectiveCampusFilter === "all") {
      const targetsByMetric = new Map<string, BenchmarkTarget[]>();
      for (const target of targets) {
        if (!target.metric) continue;
        const list = targetsByMetric.get(target.metric.key) ?? [];
        list.push(target);
        targetsByMetric.set(target.metric.key, list);
      }

      for (const [metricKey, metricTargets] of targetsByMetric) {
        if (churchWideMetricKeys.has(metricKey)) continue;

        const hasCampusBenchmarks = metricTargets.some(
          (t) => t.campus_id !== null
        );
        if (!hasCampusBenchmarks) continue;

        const benchmarkRow = findBenchmark(metricTargets, metricKey, null);
        if (!benchmarkRow?.metric) continue;

        const row = buildRow(
          benchmarkRow,
          snapshots,
          "Church-wide",
          `church-wide-${metricKey}`,
          null
        );
        if (row) built.push(row);
      }
    }

    return built;
  }, [targets, snapshots, effectiveCampusFilter]);

  const rows = useMemo(
    () =>
      [...unsortedRows].sort((a, b) =>
        compareRows(a, b, sortColumn, sortDirection)
      ),
    [unsortedRows, sortColumn, sortDirection]
  );

  if (targets.length === 0) return null;

  return (
    <div className="sfdc-widget">
      <div className="sfdc-widget__header">
        <div>
          <h3 className="sfdc-widget__title">Benchmark comparison</h3>
          <p className="sfdc-metric-subtitle mt-1">
            Green = at or above benchmark · Yellow = within 10% · Red = more
            than 10% below
          </p>
        </div>
        {!campusId && (
          <label className="sfdc-field shrink-0">
            <span className="sfdc-field__label">Campus</span>
            <select
              className="sfdc-select"
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              aria-label="Filter benchmarks by campus"
            >
              <option value="all">All Benchmarks</option>
              <option value="church-wide">Church-wide</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="sfdc-widget__body">
        {rows.length === 0 ? (
          <p className="text-sm text-base-content/60">
            No benchmarks match this campus filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <SortableHeader
                    label="Status"
                    column="status"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Metric"
                    column="metric"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Campus"
                    column="campus"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th>Actual ({DEFAULT_FISCAL_YEAR})</th>
                  <th>Benchmark</th>
                  <th>% of benchmark</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ rowKey, target, actual, stoplight, campusLabel }) => (
                  <tr key={rowKey}>
                    <td>
                      {stoplight ? (
                        <StoplightBadge
                          status={stoplight.status}
                          label={stoplight.label}
                        />
                      ) : (
                        <span className="text-xs text-base-content/50">—</span>
                      )}
                    </td>
                    <td>
                      {target.metric?.label}
                      {target.label && (
                        <span className="block text-xs text-base-content/50">
                          {target.label}
                        </span>
                      )}
                    </td>
                    <td>{campusLabel}</td>
                    <td>
                      {actual === null || !target.metric
                        ? "—"
                        : formatValue(actual, target.metric.unit)}
                    </td>
                    <td>
                      {target.metric
                        ? formatValue(target.target_value, target.metric.unit)
                        : target.target_value}
                    </td>
                    <td>
                      {stoplight
                        ? `${stoplight.percentOfBenchmark.toFixed(0)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
