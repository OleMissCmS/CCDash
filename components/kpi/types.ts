import type { StoplightResult, StoplightStatus } from "@/lib/benchmarks";
import type { Metric } from "@/lib/types";

export type BudgetPaceGaugeProps = {
  percentOfBudget: number;
  status: StoplightStatus;
  label: string;
  subcaption?: string | null;
  meta?: string | null;
};

export type KpiCardRenderProps = {
  metric: Metric;
  value: number;
  benchmark?: number | null;
  stoplight?: StoplightResult | null;
  benchmarkLabel?: string | null;
  subtitle?: string;
  headerAction?: React.ReactNode;
  budgetPaceGauge?: BudgetPaceGaugeProps | null;
};

export type KpiCardStyleId =
  | "classic"
  | "edgy"
  | "stripe"
  | "stat"
  | "hero"
  | "split"
  | "tile"
  | "bar"
  | "salesforce";

export type KpiCardStyleMeta = {
  id: KpiCardStyleId;
  name: string;
  tagline: string;
};
