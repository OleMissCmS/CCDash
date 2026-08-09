import type { StoplightResult } from "@/lib/benchmarks";
import type { Metric } from "@/lib/types";

export type KpiCardRenderProps = {
  metric: Metric;
  value: number;
  benchmark?: number | null;
  stoplight?: StoplightResult | null;
  benchmarkLabel?: string | null;
  subtitle?: string;
};

export type KpiCardStyleId =
  | "classic"
  | "edgy"
  | "stripe"
  | "stat"
  | "hero"
  | "split"
  | "tile"
  | "bar";

export type KpiCardStyleMeta = {
  id: KpiCardStyleId;
  name: string;
  tagline: string;
};
