import { formatValue } from "@/lib/format";
import type { StoplightResult, StoplightStatus } from "@/lib/benchmarks";
import type { Metric } from "@/lib/types";
import { Stoplight, StoplightBadge } from "./Stoplight";

function getProgressStatus(
  stoplight: StoplightResult | null | undefined,
  progress: number | null
): StoplightStatus {
  return (
    stoplight?.status ??
    (progress === null
      ? "green"
      : progress >= 100
        ? "green"
        : progress >= 90
          ? "yellow"
          : "red")
  );
}

function getProgressBarFillClass(status: StoplightStatus): string {
  switch (status) {
    case "green":
      return "bg-[#2563eb]";
    case "yellow":
      return "bg-warning";
    case "red":
      return "bg-error";
  }
}

type KpiCardProps = {
  metric: Metric;
  value: number;
  target?: number | null;
  benchmark?: number | null;
  stoplight?: StoplightResult | null;
  benchmarkLabel?: string | null;
  subtitle?: string;
};

export function KpiCard({
  metric,
  value,
  target,
  benchmark,
  stoplight,
  benchmarkLabel,
  subtitle,
}: KpiCardProps) {
  const progress =
    target && target > 0 ? Math.min(100, (value / target) * 100) : null;
  const progressStatus = getProgressStatus(stoplight, progress);

  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
            {metric.label}
          </p>
          {stoplight && (
            <Stoplight
              status={stoplight.status}
              label={stoplight.label}
              showLabel={false}
            />
          )}
        </div>
        <p className="text-2xl font-semibold tabular-nums">
          {formatValue(value, metric.unit)}
        </p>
        {benchmark != null && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-base-content/60">
              Benchmark: {formatValue(benchmark, metric.unit)}
              {benchmarkLabel ? ` · ${benchmarkLabel}` : ""}
            </span>
            {stoplight && (
              <StoplightBadge status={stoplight.status} label={stoplight.label} />
            )}
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-base-content/60">{subtitle}</p>
        )}
        {progress !== null && (
          <div className="mt-1">
            <div className="flex justify-between text-xs text-base-content/60 mb-1">
              <span>FY26/27 target</span>
              <span>{formatValue(target!, metric.unit)}</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-box bg-base-content/15"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-box transition-[width] ${getProgressBarFillClass(progressStatus)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
