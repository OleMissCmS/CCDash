import { KpiCard } from "@/components/KpiCard";
import { VolunteerMatrixBreakdown } from "@/components/VolunteerMatrixBreakdown";
import { VolunteerMatrixCountRatioCard } from "@/components/VolunteerMatrixCountRatioCard";
import { VolunteerMatrixPercentGaugeCard } from "@/components/VolunteerMatrixPercentGaugeCard";
import type { VolunteerMatrixView } from "@/lib/volunteer-matrix";
import type { Metric } from "@/lib/types";

type VolunteerMatrixSectionProps = {
  data: VolunteerMatrixView;
};

function metricCard(
  key: string,
  label: string,
  unit: string,
  sortOrder: number
): Metric {
  return {
    id: key,
    key,
    label,
    unit,
    category: "serving",
    requires_financial: false,
    sort_order: sortOrder,
  };
}

const KPI_METRICS = {
  perService: metricCard(
    "volunteer_per_service_need",
    "Per service need",
    "count",
    5
  ),
  gap: metricCard("volunteer_open_positions", "Open positions", "count", 6),
};

export function VolunteerMatrixSection({ data }: VolunteerMatrixSectionProps) {
  const { totals, filterLabel, breakdownCampuses, ministryAreaSlug, source, warnings } =
    data;

  return (
    <section className="space-y-6">
      {source === "sample" && (
        <div className="alert alert-warning shadow-sm">
          <div>
            <p className="font-medium">Draft data — sheet not connected yet</p>
            <p className="text-sm opacity-90">
              Publish the Google Sheet as &quot;Anyone with the link can view&quot;
              so live volunteer matrix data can load. Showing sample numbers for
              now.
            </p>
          </div>
        </div>
      )}

      {warnings.length > 0 && source === "google_sheets" && (
        <div className="alert alert-info shadow-sm">
          <ul className="list-disc pl-4 text-sm space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-base-content/60">
        KPI cards reflect{" "}
        <span className="font-medium">{filterLabel}</span>
        {source === "google_sheets" ? " · live from Google Sheets" : ""}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <VolunteerMatrixPercentGaugeCard
          label="Pool filled"
          percent={totals.poolFilledPct}
          subtitle={`${filterLabel} · active volunteers ÷ pool`}
        />
        <VolunteerMatrixCountRatioCard
          label="Current vs total need"
          current={totals.current}
          total={totals.rotationPool}
          subtitle={`${filterLabel} · active volunteers vs rotation pool`}
        />
        <KpiCard
          metric={KPI_METRICS.perService}
          value={totals.perServiceNeed}
          subtitle={`${filterLabel} · per service positions`}
        />
        <KpiCard
          metric={KPI_METRICS.gap}
          value={totals.gap}
          subtitle={`${filterLabel} · rotation pool minus current`}
        />
      </div>

      <VolunteerMatrixBreakdown
        key={`${data.campusSlug ?? "all"}-${ministryAreaSlug ?? "all"}`}
        campuses={breakdownCampuses}
        initialMinistryAreaSlug={ministryAreaSlug}
      />
    </section>
  );
}
