import { KpiCard } from "@/components/KpiCard";
import { BenchmarkComparisonTable } from "@/components/BenchmarkComparisonTable";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { CampusCompareChart, TrendChart } from "@/components/Charts";
import { createClient } from "@/lib/supabase/server";
import {
  findBenchmark,
  getStoplightStatus,
  metricsWhereHigherIsBetter,
} from "@/lib/benchmarks";
import type { CompareMode } from "@/lib/comparison";
import { getAnnualSnapshots, getBenchmarkTargets, getDashboardData, getSnapshotValue } from "@/lib/metrics";
import type {
  Campus,
  MetricCategory,
  YearMode,
} from "@/lib/types";
import { DEFAULT_FISCAL_YEAR, TARGET_FISCAL_YEAR } from "@/lib/types";

type DashboardSectionProps = {
  category: MetricCategory;
  campusId: string | null;
  yearMode: YearMode;
  compareMode: CompareMode;
  campuses: Campus[];
  canViewStewardship: boolean;
};

function getTarget(
  targets: Awaited<ReturnType<typeof getDashboardData>>["targets"],
  metricKey: string,
  campusId: string | null
) {
  const match = targets.find(
    (t) =>
      t.metric?.key === metricKey &&
      (campusId ? t.campus_id === campusId : true)
  );
  return match?.target_value ?? null;
}

export async function DashboardSection({
  category,
  campusId,
  yearMode,
  compareMode,
  campuses,
}: DashboardSectionProps) {
  const supabase = await createClient();
  const { metrics, snapshots, targets, trend, baptisms } =
    await getDashboardData(supabase, {
      campusId: compareMode === "cross-campus" ? null : campusId,
      category,
      yearMode,
    });

  const [allBenchmarkTargets, allAnnualSnapshots] = await Promise.all([
    getBenchmarkTargets(supabase, TARGET_FISCAL_YEAR),
    getAnnualSnapshots(supabase, DEFAULT_FISCAL_YEAR),
  ]);

  const compareData = metrics
    .filter((m) => m.category === category)
    .slice(0, 1)
    .flatMap((metric) => {
      const byCampus = snapshots.filter((s) => s.metric?.key === metric.key);
      if (campusId && compareMode !== "cross-campus") {
        const one = byCampus.find((s) => s.campus_id === campusId);
        return one
          ? [{ campus: one.campus?.name ?? "Campus", value: one.value }]
          : [];
      }
      return byCampus.map((s) => ({
        campus: s.campus?.name ?? "Campus",
        value: s.value,
      }));
    });

  const primaryMetrics = metrics.filter((m) => m.category === category);
  const cardCampusId =
    compareMode === "cross-campus" ? null : campusId;

  return (
    <section className="space-y-6">
      <ComparisonPanel
        mode={compareMode}
        metrics={primaryMetrics}
        snapshots={snapshots}
        campuses={campuses}
        campusId={campusId}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {primaryMetrics.map((metric) => {
          let value = getSnapshotValue(snapshots, metric.key, cardCampusId);
          if (metric.key === "baptisms" && baptisms.length > 0) {
            value =
              cardCampusId != null
                ? baptisms.find((b) => b.campus_id === cardCampusId)?.value ??
                  null
                : baptisms.reduce((sum, b) => sum + b.value, 0);
          }
          if (value === null) return null;

          const target = getTarget(targets, metric.key, cardCampusId);
          const benchmarkRow = findBenchmark(targets, metric.key, cardCampusId);
          const benchmark = benchmarkRow?.target_value ?? null;
          const stoplight =
            benchmark != null
              ? getStoplightStatus(
                  value,
                  benchmark,
                  metricsWhereHigherIsBetter(metric.key)
                )
              : null;

          const subtitle =
            metric.key === "baptisms"
              ? yearMode === "fiscal"
                ? "Fiscal year view (May–Apr)"
                : "Calendar year 2025"
              : undefined;

          return (
            <KpiCard
              key={metric.id}
              metric={metric}
              value={value}
              target={target}
              benchmark={benchmark}
              stoplight={stoplight}
              benchmarkLabel={benchmarkRow?.label}
              subtitle={subtitle}
            />
          );
        })}
      </div>

      {compareMode === "off" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {category === "attendance" && trend.length > 0 && (
            <TrendChart
              data={
                campusId ? trend.filter((t) => t.campus_id === campusId) : trend
              }
              title="Total in-person attendance trend (monthly)"
            />
          )}
          {compareData.length > 0 && (
            <CampusCompareChart
              data={compareData}
              title={`${primaryMetrics[0]?.label ?? "Metric"} by campus`}
            />
          )}
        </div>
      )}

      {allBenchmarkTargets.length > 0 && (
        <BenchmarkComparisonTable
          targets={allBenchmarkTargets}
          snapshots={allAnnualSnapshots}
          campuses={campuses}
        />
      )}
    </section>
  );
}
