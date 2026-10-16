import type { BenchmarkTarget } from "./types";

export type StoplightStatus = "green" | "yellow" | "red";

export type StoplightResult = {
  status: StoplightStatus;
  label: string;
  benchmark: number;
  actual: number;
  percentOfBenchmark: number;
};

const STATUS_LABELS: Record<StoplightStatus, string> = {
  green: "On track",
  yellow: "Needs attention",
  red: "Below benchmark",
};

/** Lower number = higher priority when sorting (red first). */
export const STATUS_SORT_ORDER: Record<StoplightStatus, number> = {
  red: 0,
  yellow: 1,
  green: 2,
};

/** Green >= 100%, Yellow >= 90%, Red < 90% of benchmark (higher is better). */
export function getStoplightStatus(
  actual: number,
  benchmark: number,
  higherIsBetter = true
): StoplightResult {
  if (benchmark === 0) {
    return {
      status: "yellow",
      label: STATUS_LABELS.yellow,
      benchmark,
      actual,
      percentOfBenchmark: 0,
    };
  }

  const ratio = actual / benchmark;
  const percentOfBenchmark = ratio * 100;

  let status: StoplightStatus;
  if (higherIsBetter) {
    if (ratio >= 1) status = "green";
    else if (ratio >= 0.9) status = "yellow";
    else status = "red";
  } else {
    if (ratio <= 1) status = "green";
    else if (ratio <= 1.1) status = "yellow";
    else status = "red";
  }

  return {
    status,
    label: STATUS_LABELS[status],
    benchmark,
    actual,
    percentOfBenchmark,
  };
}

export function findBenchmark(
  benchmarks: BenchmarkTarget[],
  metricKey: string,
  campusId: string | null
): BenchmarkTarget | null {
  const matches = benchmarks.filter((b) => b.metric?.key === metricKey);
  if (matches.length === 0) return null;

  if (campusId) {
    return (
      matches.find((b) => b.campus_id === campusId) ??
      matches.find((b) => b.campus_id === null) ??
      null
    );
  }

  return matches.find((b) => b.campus_id === null) ?? matches[0] ?? null;
}

export function metricsWhereHigherIsBetter(metricKey: string): boolean {
  return !metricKey.includes("decline");
}
