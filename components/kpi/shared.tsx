import { formatValue } from "@/lib/format";
import type { StoplightStatus } from "@/lib/benchmarks";
import { Stoplight, StoplightBadge } from "@/components/Stoplight";
import type { KpiCardRenderProps } from "./types";

export const STATUS_BORDER: Record<StoplightStatus, string> = {
  green: "border-l-[#5a8f6a]",
  yellow: "border-l-warning",
  red: "border-l-error",
};

export const STATUS_BG: Record<StoplightStatus, string> = {
  green: "bg-success/10",
  yellow: "bg-warning/10",
  red: "bg-error/10",
};

export const STATUS_BAR: Record<StoplightStatus, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-error",
};

export function KpiLabel({ metric }: Pick<KpiCardRenderProps, "metric">) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
      {metric.label}
    </p>
  );
}

export function KpiValue({
  metric,
  value,
  className = "text-2xl font-semibold tabular-nums",
}: Pick<KpiCardRenderProps, "metric" | "value"> & { className?: string }) {
  return (
    <p className={className}>{formatValue(value, metric.unit)}</p>
  );
}

export function KpiBenchmarkRow({
  benchmark,
  metric,
  benchmarkLabel,
  stoplight,
}: Pick<
  KpiCardRenderProps,
  "benchmark" | "metric" | "benchmarkLabel" | "stoplight"
>) {
  if (benchmark == null) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-base-content/60">
        Benchmark: {formatValue(benchmark, metric.unit)}
        {benchmarkLabel ? ` · ${benchmarkLabel}` : ""}
      </span>
      {stoplight && (
        <StoplightBadge status={stoplight.status} label={stoplight.label} />
      )}
    </div>
  );
}

export function KpiSubtitle({ subtitle }: { subtitle?: string }) {
  if (!subtitle) return null;
  return <p className="text-xs text-base-content/60">{subtitle}</p>;
}

export function KpiStoplightDot({
  stoplight,
}: {
  stoplight?: KpiCardRenderProps["stoplight"];
}) {
  if (!stoplight) return null;
  return (
    <Stoplight
      status={stoplight.status}
      label={stoplight.label}
      showLabel={false}
    />
  );
}

export function benchmarkPercent(
  value: number,
  benchmark: number | null | undefined
): number {
  if (!benchmark || benchmark <= 0) return 0;
  return Math.min(100, (value / benchmark) * 100);
}
