import { getMetricValueForCardPeriod } from "./card-periods";
import type { Campus, Metric, MetricSnapshot } from "./types";

export type CompareMode = "off" | "cross-campus" | "vs-church";

const COMPARISON_PERIOD = "last-12-months" as const;

export type CampusMetricValue = {
  campusId: string;
  campusName: string;
  value: number;
};

export function getCampusMetricValue(
  monthlySnapshots: MetricSnapshot[],
  metricKey: string,
  campusId: string
): number | null {
  return getMetricValueForCardPeriod(
    monthlySnapshots,
    metricKey,
    COMPARISON_PERIOD,
    campusId
  );
}

export function getChurchWideMetricValue(
  monthlySnapshots: MetricSnapshot[],
  metricKey: string
): number | null {
  return getMetricValueForCardPeriod(
    monthlySnapshots,
    metricKey,
    COMPARISON_PERIOD,
    null
  );
}

export function getCrossCampusValues(
  monthlySnapshots: MetricSnapshot[],
  metricKey: string,
  campuses: Campus[]
): CampusMetricValue[] {
  return campuses
    .map((campus) => {
      const value = getCampusMetricValue(monthlySnapshots, metricKey, campus.id);
      if (value === null) return null;
      return { campusId: campus.id, campusName: campus.name, value };
    })
    .filter((row): row is CampusMetricValue => row !== null);
}

export function buildCrossCampusChartData(
  monthlySnapshots: MetricSnapshot[],
  metrics: Metric[],
  campuses: Campus[]
) {
  const primary =
    metrics.find(
      (metric) => getCrossCampusValues(monthlySnapshots, metric.key, campuses).length > 0
    ) ?? metrics[0];
  if (!primary) return [];

  return getCrossCampusValues(monthlySnapshots, primary.key, campuses).map((row) => ({
    campus: row.campusName,
    value: row.value,
  }));
}
