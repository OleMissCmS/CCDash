import type { Campus, Metric, MetricSnapshot } from "./types";

export type CompareMode = "off" | "cross-campus" | "vs-church";

export type CampusMetricValue = {
  campusId: string;
  campusName: string;
  value: number;
};

export function getCampusMetricValue(
  snapshots: MetricSnapshot[],
  metricKey: string,
  campusId: string
): number | null {
  const match = snapshots.find(
    (s) => s.metric?.key === metricKey && s.campus_id === campusId
  );
  return match?.value ?? null;
}

export function getChurchWideMetricValue(
  snapshots: MetricSnapshot[],
  metricKey: string
): number | null {
  const matches = snapshots.filter((s) => s.metric?.key === metricKey);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].value;

  const unit = matches[0].metric?.unit;
  if (unit === "percent") {
    return matches.reduce((sum, s) => sum + s.value, 0) / matches.length;
  }
  return matches.reduce((sum, s) => sum + s.value, 0);
}

export function getCrossCampusValues(
  snapshots: MetricSnapshot[],
  metricKey: string,
  campuses: Campus[]
): CampusMetricValue[] {
  return campuses
    .map((campus) => {
      const value = getCampusMetricValue(snapshots, metricKey, campus.id);
      if (value === null) return null;
      return { campusId: campus.id, campusName: campus.name, value };
    })
    .filter((row): row is CampusMetricValue => row !== null);
}

export function buildCrossCampusChartData(
  snapshots: MetricSnapshot[],
  metrics: Metric[],
  campuses: Campus[]
) {
  const primary = metrics[0];
  if (!primary) return [];

  return getCrossCampusValues(snapshots, primary.key, campuses).map((row) => ({
    campus: row.campusName,
    value: row.value,
  }));
}
