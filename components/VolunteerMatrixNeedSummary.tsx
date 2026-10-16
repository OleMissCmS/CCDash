import Link from "next/link";
import { StoplightBadge } from "@/components/Stoplight";
import { STATUS_BORDER } from "@/components/kpi/shared";
import { formatValue } from "@/lib/format";
import type { VolunteerMatrixAreaSummary } from "@/lib/volunteer-matrix";
import type { VolunteerCampusSlug } from "@/lib/google-sheets-volunteer-matrix";

type VolunteerMatrixNeedSummaryProps = {
  summaries: VolunteerMatrixAreaSummary[];
  campusSlug: VolunteerCampusSlug | null;
  campusLabel: string;
  activeMinistrySlug: string | null;
};

function summaryHref(
  campusSlug: VolunteerCampusSlug | null,
  ministrySlug: string
): string {
  const params = new URLSearchParams();
  if (campusSlug) params.set("campus", campusSlug);
  params.set("ministry", ministrySlug);
  return `/volunteer-matrix?${params.toString()}`;
}

export function VolunteerMatrixNeedSummary({
  summaries,
  campusSlug,
  campusLabel,
  activeMinistrySlug,
}: VolunteerMatrixNeedSummaryProps) {
  const topGap = summaries[0]?.gap ?? 0;

  return (
    <section className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <div className="space-y-1">
          <h2 className="card-title text-base">Greatest need by ministry area</h2>
          <p className="text-sm text-base-content/60">
            Ranked by open rotation pool positions · {campusLabel}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {summaries.map((area, index) => {
            const isActive = activeMinistrySlug === area.slug;
            const border = `border-l-[5px] ${STATUS_BORDER[area.status.status]}`;
            const isTopNeed = index === 0 && topGap > 0;

            return (
              <Link
                key={area.slug}
                href={summaryHref(campusSlug, area.slug)}
                className={`rounded-sm border border-base-300 bg-base-100 p-4 shadow-sm transition-colors hover:bg-base-200/40 ${border} ${
                  isActive ? "ring-2 ring-primary/30" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-base-content/55">
                      #{index + 1}
                      {isTopNeed ? " · highest need" : ""}
                    </p>
                    <p className="font-semibold text-sm leading-snug">
                      {area.label}
                    </p>
                  </div>
                  <StoplightBadge
                    status={area.status.status}
                    label={area.status.label}
                  />
                </div>

                <div className="mt-3 space-y-1">
                  <p className="text-2xl font-bold tabular-nums leading-none">
                    {formatValue(area.gap, "count")}
                    <span className="ml-1.5 text-sm font-medium text-base-content/55">
                      open
                    </span>
                  </p>
                  <p className="text-sm text-base-content/65 tabular-nums">
                    {formatValue(area.current, "count")} /{" "}
                    {formatValue(area.rotationPool, "count")} filled
                    {area.poolFilledPct != null && (
                      <>
                        {" "}
                        · {formatValue(area.poolFilledPct, "percent")}
                      </>
                    )}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
