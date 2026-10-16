import { BenchmarkGauge } from "@/components/BenchmarkGauge";
import { formatValue } from "@/lib/format";
import { SfdcWidget } from "@/components/sfdc/SfdcWidget";
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
  const {
    metric,
    value,
    benchmark,
    stoplight,
    benchmarkLabel,
    subtitle,
    headerAction,
    budgetPaceGauge,
  } = props;
  const showGauge = benchmark != null && stoplight != null;

  return (
    <SfdcWidget
      title={metric.label}
      className="sfdc-kpi-card"
      headerAction={
        headerAction || stoplight ? (
          <div className="flex items-center gap-2">
            {headerAction}
            {stoplight ? (
              <StoplightBadge status={stoplight.status} label={stoplight.label} />
            ) : null}
          </div>
        ) : undefined
      }
    >
      <p className="sfdc-kpi-value">{formatValue(value, metric.unit)}</p>
      {benchmark != null && (
        <p className="sfdc-kpi-meta">
          Target {formatValue(benchmark, metric.unit)}
          {benchmarkLabel ? ` · ${benchmarkLabel}` : ""}
        </p>
      )}
      {subtitle && <p className="sfdc-kpi-meta">{subtitle}</p>}
      {budgetPaceGauge && (
        <div className="mt-3 border-t border-[var(--sfdc-border)] pt-3">
          {budgetPaceGauge.meta && (
            <p className="sfdc-kpi-meta mb-2">{budgetPaceGauge.meta}</p>
          )}
          <BenchmarkGauge
            percentOfBenchmark={budgetPaceGauge.percentOfBudget}
            status={budgetPaceGauge.status}
            label={budgetPaceGauge.label}
            variant="edgy"
            subcaption={budgetPaceGauge.subcaption ?? "of annual budget"}
          />
        </div>
      )}
      {showGauge && stoplight && (
        <div className="mt-3 border-t border-[var(--sfdc-border)] pt-3">
          <BenchmarkGauge
            percentOfBenchmark={stoplight.percentOfBenchmark}
            status={stoplight.status}
            label={stoplight.label}
            variant="edgy"
          />
        </div>
      )}
    </SfdcWidget>
  );
}

export function ClassicKpiCard(props: KpiCardRenderProps) {
  const { metric, value, benchmark, stoplight, benchmarkLabel, subtitle } =
    props;
  const showGauge = benchmark != null && stoplight != null;

  return (
    <SfdcWidget
      title={metric.label}
      className="sfdc-kpi-card"
      headerAction={<KpiStoplightDot stoplight={stoplight} />}
    >
      <KpiValue metric={metric} value={value} />
      <KpiBenchmarkRow
        benchmark={benchmark}
        metric={metric}
        benchmarkLabel={benchmarkLabel}
        stoplight={stoplight}
      />
      <KpiSubtitle subtitle={subtitle} />
      {showGauge && stoplight && (
        <div className="mt-3 border-t border-[var(--sfdc-border)] pt-3">
          <BenchmarkGauge
            percentOfBenchmark={stoplight.percentOfBenchmark}
            status={stoplight.status}
            label={stoplight.label}
          />
        </div>
      )}
    </SfdcWidget>
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
    stoplight != null ? STATUS_BAR[stoplight.status] : "bg-[var(--sfdc-brand)]/50";

  return (
    <SfdcWidget
      title={metric.label}
      className="sfdc-kpi-card"
      headerAction={<KpiStoplightDot stoplight={stoplight} />}
    >
      <KpiValue metric={metric} value={value} />
      {benchmark != null && (
        <div className="mt-2 space-y-1.5">
          <div className="h-2 w-full rounded-full bg-[var(--sfdc-border)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barClass}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[var(--sfdc-text-weak)]">
            <span>
              {formatValue(benchmark, metric.unit)} target
              {benchmarkLabel ? ` · ${benchmarkLabel}` : ""}
            </span>
            <span>{Math.round(pct)}%</span>
          </div>
        </div>
      )}
      <KpiSubtitle subtitle={subtitle} />
    </SfdcWidget>
  );
}

export function SalesforceKpiCard(props: KpiCardRenderProps) {
  const { metric, value, benchmark, stoplight, benchmarkLabel, subtitle } =
    props;

  return (
    <SfdcWidget title={metric.label} className="sfdc-kpi-card">
      <p className="sfdc-kpi-value">{formatValue(value, metric.unit)}</p>
      {benchmark != null && (
        <p className="sfdc-kpi-meta">
          Target {formatValue(benchmark, metric.unit)}
          {benchmarkLabel ? ` · ${benchmarkLabel}` : ""}
        </p>
      )}
      {stoplight && (
        <p className="sfdc-kpi-status">
          <StoplightBadge status={stoplight.status} label={stoplight.label} />
          <span>{Math.round(stoplight.percentOfBenchmark)}% of benchmark</span>
        </p>
      )}
      {subtitle && <p className="sfdc-kpi-meta">{subtitle}</p>}
    </SfdcWidget>
  );
}
