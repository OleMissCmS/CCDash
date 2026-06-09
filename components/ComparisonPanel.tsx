import { CampusCompareChart } from "@/components/Charts";
import {
  buildCrossCampusChartData,
  getCampusMetricValue,
  getChurchWideMetricValue,
  getCrossCampusValues,
  type CompareMode,
} from "@/lib/comparison";
import { formatValue } from "@/lib/format";
import type { Campus, Metric, MetricSnapshot } from "@/lib/types";

type ComparisonPanelProps = {
  mode: CompareMode;
  metrics: Metric[];
  snapshots: MetricSnapshot[];
  campuses: Campus[];
  campusId: string | null;
};

export function ComparisonPanel({
  mode,
  metrics,
  snapshots,
  campuses,
  campusId,
}: ComparisonPanelProps) {
  if (mode === "off") return null;

  if (mode === "vs-church" && !campusId) {
    return (
      <div className="alert alert-info shadow-sm">
        <span>
          Select a campus from the top menu to compare it against church-wide
          totals.
        </span>
      </div>
    );
  }

  const selectedCampus = campuses.find((c) => c.id === campusId);

  if (mode === "cross-campus") {
    const chartData = buildCrossCampusChartData(snapshots, metrics, campuses);

    return (
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <div>
            <h3 className="font-semibold text-base">Cross-campus comparison</h3>
            <p className="text-sm text-base-content/60">
              All campuses side by side for metrics in this section.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Metric</th>
                  {campuses.map((c) => (
                    <th key={c.id}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => {
                  const rows = getCrossCampusValues(
                    snapshots,
                    metric.key,
                    campuses
                  );
                  if (rows.length === 0) return null;

                  const valuesByCampus = Object.fromEntries(
                    rows.map((r) => [r.campusId, r.value])
                  );
                  const maxValue = Math.max(...rows.map((r) => r.value));

                  return (
                    <tr key={metric.id}>
                      <td className="font-medium">{metric.label}</td>
                      {campuses.map((campus) => {
                        const value = valuesByCampus[campus.id];
                        if (value == null) {
                          return (
                            <td key={campus.id} className="text-base-content/40">
                              —
                            </td>
                          );
                        }
                        const isHighest =
                          metric.unit !== "percent" && value === maxValue;
                        return (
                          <td
                            key={campus.id}
                            className={isHighest ? "font-semibold text-primary" : ""}
                          >
                            {formatValue(value, metric.unit)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {chartData.length > 0 && (
            <CampusCompareChart
              data={chartData}
              title={`${metrics[0]?.label ?? "Metric"} by campus`}
            />
          )}
        </div>
      </div>
    );
  }

  if (mode === "vs-church" && selectedCampus) {
    return (
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <div>
            <h3 className="font-semibold text-base">
              {selectedCampus.name} vs church-wide
            </h3>
            <p className="text-sm text-base-content/60">
              How this campus compares to the combined church total (or average
              for percentage metrics).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>{selectedCampus.name}</th>
                  <th>Church-wide</th>
                  <th>Campus share / gap</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => {
                  const campusValue = getCampusMetricValue(
                    snapshots,
                    metric.key,
                    selectedCampus.id
                  );
                  const churchValue = getChurchWideMetricValue(
                    snapshots,
                    metric.key
                  );
                  if (campusValue === null || churchValue === null) return null;

                  let shareLabel: string;
                  if (metric.unit === "percent") {
                    const gap = campusValue - churchValue;
                    shareLabel = `${gap >= 0 ? "+" : ""}${gap.toFixed(1)} pts vs avg`;
                  } else if (churchValue === 0) {
                    shareLabel = "—";
                  } else {
                    const share = (campusValue / churchValue) * 100;
                    shareLabel = `${share.toFixed(1)}% of church total`;
                  }

                  return (
                    <tr key={metric.id}>
                      <td className="font-medium">{metric.label}</td>
                      <td>{formatValue(campusValue, metric.unit)}</td>
                      <td>{formatValue(churchValue, metric.unit)}</td>
                      <td className="text-base-content/80">{shareLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <CampusCompareChart
            data={[
              {
                campus: selectedCampus.name,
                value:
                  getCampusMetricValue(
                    snapshots,
                    metrics[0]?.key ?? "",
                    selectedCampus.id
                  ) ?? 0,
              },
              {
                campus: "Church-wide",
                value:
                  getChurchWideMetricValue(
                    snapshots,
                    metrics[0]?.key ?? ""
                  ) ?? 0,
              },
            ]}
            title={`${metrics[0]?.label ?? "Metric"}: campus vs church-wide`}
          />
        </div>
      </div>
    );
  }

  return null;
}
