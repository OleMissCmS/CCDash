import { BenchmarkGauge } from "@/components/BenchmarkGauge";
import { formatValue } from "@/lib/format";
import type { KpiCardRenderProps } from "./types";
import { StoplightBadge } from "@/components/Stoplight";
import {
  KpiBenchmarkRow,
  KpiLabel,
  KpiStoplightDot,
  KpiSubtitle,
  KpiValue,
  STATUS_BAR,
  STATUS_BG,
  STATUS_BORDER,
  benchmarkPercent,
} from "./shared";

export function EdgyGaugeKpiCard(props: KpiCardRenderProps) {
  const { metric, value, benchmark, stoplight, benchmarkLabel, subtitle } =
    props;
  const showGauge = benchmark != null && stoplight != null;
  const border =
    stoplight != null
      ? `border-l-[5px] ${STATUS_BORDER[stoplight.status]}`
      : "border-l-[5px] border-l-base-content/20";

  return (
    <div
      className={`rounded-sm bg-base-100 border border-base-300 shadow-sm overflow-hidden ring-1 ring-base-content/5 ${border}`}
    >
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-base-content/55">
          {metric.label}
        </p>
        {stoplight && (
          <StoplightBadge status={stoplight.status} label={stoplight.label} />
        )}
      </div>

      <div className="px-4 pb-2">
        <p className="text-3xl font-bold tabular-nums tracking-tight leading-none">
          {formatValue(value, metric.unit)}
        </p>
      </div>

      {benchmark != null && (
        <div className="px-4 pb-2">
          <p className="text-xs text-base-content/60">
            Target {formatValue(benchmark, metric.unit)}
            {benchmarkLabel ? ` · ${benchmarkLabel}` : ""}
          </p>
        </div>
      )}

      {subtitle && (
        <p className="px-4 pb-2 text-[11px] text-base-content/50">{subtitle}</p>
      )}

      {showGauge && stoplight && (
        <div className="px-4 pb-4 pt-1 border-t border-base-300/70 bg-base-200/30">
          <BenchmarkGauge
            percentOfBenchmark={stoplight.percentOfBenchmark}
            status={stoplight.status}
            label={stoplight.label}
            variant="edgy"
          />
        </div>
      )}
    </div>
  );
}

export function ClassicKpiCard(props: KpiCardRenderProps) {
  const { metric, value, benchmark, stoplight, benchmarkLabel, subtitle } =
    props;
  const showGauge = benchmark != null && stoplight != null;

  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <KpiLabel metric={metric} />
          <KpiStoplightDot stoplight={stoplight} />
        </div>
        <KpiValue metric={metric} value={value} />
        <KpiBenchmarkRow
          benchmark={benchmark}
          metric={metric}
          benchmarkLabel={benchmarkLabel}
          stoplight={stoplight}
        />
        <KpiSubtitle subtitle={subtitle} />
        {showGauge && stoplight && (
          <BenchmarkGauge
            percentOfBenchmark={stoplight.percentOfBenchmark}
            status={stoplight.status}
            label={stoplight.label}
          />
        )}
      </div>
    </div>
  );
}

export function StripeKpiCard(props: KpiCardRenderProps) {
  const { metric, value, benchmark, stoplight, benchmarkLabel, subtitle } =
    props;
  const border =
    stoplight != null
      ? `border-l-4 ${STATUS_BORDER[stoplight.status]}`
      : "border-l-4 border-l-base-300";

  return (
    <div
      className={`card bg-base-100 shadow-sm border border-base-300 ${border}`}
    >
      <div className="card-body p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <KpiLabel metric={metric} />
          {stoplight && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50">
              {stoplight.label}
            </span>
          )}
        </div>
        <KpiValue metric={metric} value={value} />
        <KpiBenchmarkRow
          benchmark={benchmark}
          metric={metric}
          benchmarkLabel={benchmarkLabel}
          stoplight={stoplight}
        />
        <KpiSubtitle subtitle={subtitle} />
      </div>
    </div>
  );
}

export function StatKpiCard(props: KpiCardRenderProps) {
  const { metric, value, benchmark, stoplight, benchmarkLabel, subtitle } =
    props;

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-4">
        <div className="stat p-0">
          <div className="stat-figure text-base-content/20">
            <KpiStoplightDot stoplight={stoplight} />
          </div>
          <div className="stat-title text-xs uppercase tracking-wide">
            {metric.label}
          </div>
          <div className="stat-value text-2xl text-base-content">
            {formatValue(value, metric.unit)}
          </div>
          {benchmark != null && (
            <div className="stat-desc">
              Target {formatValue(benchmark, metric.unit)}
              {benchmarkLabel ? ` · ${benchmarkLabel}` : ""}
              {stoplight ? ` · ${stoplight.label}` : ""}
            </div>
          )}
          {subtitle && <p className="stat-desc mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function HeroKpiCard(props: KpiCardRenderProps) {
  const { metric, value, benchmark, stoplight, benchmarkLabel, subtitle } =
    props;

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div className="card-body p-4 gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-base-content/50">
            {metric.label}
          </span>
          {stoplight && (
            <span
              className={`badge badge-sm badge-outline ${
                stoplight.status === "green"
                  ? "border-success text-success"
                  : stoplight.status === "yellow"
                    ? "border-warning text-warning"
                    : "border-error text-error"
              }`}
            >
              {stoplight.label}
            </span>
          )}
        </div>
        <p className="text-4xl font-bold tabular-nums tracking-tight leading-none">
          {formatValue(value, metric.unit)}
        </p>
        {benchmark != null && (
          <p className="text-sm text-base-content/60">
            vs {formatValue(benchmark, metric.unit)} benchmark
            {benchmarkLabel ? ` (${benchmarkLabel})` : ""}
          </p>
        )}
        <KpiSubtitle subtitle={subtitle} />
      </div>
    </div>
  );
}

export function SplitKpiCard(props: KpiCardRenderProps) {
  const { metric, value, benchmark, stoplight, benchmarkLabel, subtitle } =
    props;
  const pct = benchmarkPercent(value, benchmark);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-4 gap-3">
        <KpiLabel metric={metric} />
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <p className="text-[10px] uppercase text-base-content/50 mb-0.5">
              Actual
            </p>
            <KpiValue
              metric={metric}
              value={value}
              className="text-xl font-semibold tabular-nums"
            />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-base-content/50 mb-0.5">
              Benchmark
            </p>
            <p className="text-xl font-semibold tabular-nums text-base-content/70">
              {benchmark != null ? formatValue(benchmark, metric.unit) : "—"}
            </p>
          </div>
        </div>
        {benchmark != null && stoplight && (
          <div className="flex items-center justify-between text-xs text-base-content/60">
            <span>{Math.round(pct)}% of target</span>
            <span className="font-medium">{stoplight.label}</span>
          </div>
        )}
        <KpiSubtitle subtitle={subtitle} />
        {benchmarkLabel && (
          <p className="text-[10px] text-base-content/45">{benchmarkLabel}</p>
        )}
      </div>
    </div>
  );
}

export function TileKpiCard(props: KpiCardRenderProps) {
  const { metric, value, benchmark, stoplight, benchmarkLabel, subtitle } =
    props;
  const headerBg =
    stoplight != null ? STATUS_BG[stoplight.status] : "bg-base-200/80";

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div className={`px-4 py-2 ${headerBg} border-b border-base-300/60`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-base-content/80">
            {metric.label}
          </span>
          <KpiStoplightDot stoplight={stoplight} />
        </div>
      </div>
      <div className="card-body p-4 pt-3 gap-1">
        <KpiValue metric={metric} value={value} />
        {benchmark != null && (
          <p className="text-xs text-base-content/60">
            Benchmark {formatValue(benchmark, metric.unit)}
            {stoplight ? ` · ${stoplight.label}` : ""}
          </p>
        )}
        <KpiSubtitle subtitle={subtitle} />
        {benchmarkLabel && (
          <p className="text-[10px] text-base-content/45 pt-1">
            {benchmarkLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export function BarKpiCard(props: KpiCardRenderProps) {
  const { metric, value, benchmark, stoplight, benchmarkLabel, subtitle } =
    props;
  const pct = stoplight?.percentOfBenchmark ?? benchmarkPercent(value, benchmark);
  const barClass =
    stoplight != null ? STATUS_BAR[stoplight.status] : "bg-primary/40";

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body p-4 gap-3">
        <div className="flex items-start justify-between gap-2">
          <KpiLabel metric={metric} />
          <KpiStoplightDot stoplight={stoplight} />
        </div>
        <KpiValue metric={metric} value={value} />
        {benchmark != null && (
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-base-300/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barClass}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-base-content/60">
              <span>
                {formatValue(benchmark, metric.unit)} target
                {benchmarkLabel ? ` · ${benchmarkLabel}` : ""}
              </span>
              <span>{Math.round(pct)}%</span>
            </div>
          </div>
        )}
        <KpiSubtitle subtitle={subtitle} />
      </div>
    </div>
  );
}
