import type { StoplightResult } from "@/lib/benchmarks";
import type { Metric } from "@/lib/types";
import { EdgyGaugeKpiCard } from "@/components/kpi/variants";

type KpiCardProps = {
  metric: Metric;
  value: number;
  target?: number | null;
  benchmark?: number | null;
  stoplight?: StoplightResult | null;
  benchmarkLabel?: string | null;
  subtitle?: string;
  showAnnualTargets?: boolean;
};

export function KpiCard({
  metric,
  value,
  benchmark,
  stoplight,
  benchmarkLabel,
  subtitle,
}: KpiCardProps) {
  return (
    <EdgyGaugeKpiCard
      metric={metric}
      value={value}
      benchmark={benchmark}
      stoplight={stoplight}
      benchmarkLabel={benchmarkLabel}
      subtitle={subtitle}
    />
  );
}
