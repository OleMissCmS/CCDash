import type { ReactNode } from "react";
import type { CardBenchmarkEdit } from "@/components/CardBenchmarkMenu";
import type { StoplightResult } from "@/lib/benchmarks";
import type { Metric } from "@/lib/types";
import { EdgyGaugeKpiCard } from "@/components/kpi/variants";
import type { BudgetPaceGaugeProps } from "@/components/kpi/types";

type KpiCardProps = {
  metric: Metric;
  value: number;
  target?: number | null;
  benchmark?: number | null;
  stoplight?: StoplightResult | null;
  benchmarkLabel?: string | null;
  subtitle?: string;
  showAnnualTargets?: boolean;
  headerAction?: React.ReactNode;
  budgetPaceGauge?: BudgetPaceGaugeProps | null;
  benchmarkEdit?: CardBenchmarkEdit | null;
};

export function KpiCard({
  metric,
  value,
  benchmark,
  stoplight,
  benchmarkLabel,
  subtitle,
  headerAction,
  budgetPaceGauge,
  benchmarkEdit,
}: KpiCardProps) {
  return (
    <EdgyGaugeKpiCard
      metric={metric}
      value={value}
      benchmark={benchmark}
      stoplight={stoplight}
      benchmarkLabel={benchmarkLabel}
      subtitle={subtitle}
      headerAction={headerAction}
      budgetPaceGauge={budgetPaceGauge}
      benchmarkEdit={benchmarkEdit}
    />
  );
}
