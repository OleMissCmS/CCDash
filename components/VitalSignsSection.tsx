import { BaptismsPanel } from "@/components/BaptismsPanel";
import { VitalSignCard } from "@/components/VitalSignCard";
import { createClient } from "@/lib/supabase/server";
import { getCampuses } from "@/lib/metrics";
import { getVitalSignsData } from "@/lib/vital-signs";

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="text-sm text-base-content/60">{description}</p>
      )}
    </div>
  );
}

export async function VitalSignsSection({
  campusId = null,
}: {
  campusId?: string | null;
}) {
  const supabase = await createClient();
  const campuses = await getCampuses(supabase);
  const data = await getVitalSignsData(supabase, campuses, campusId);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <SectionHeading
          title="Average Attendance"
          description="Avg weekly in-person attendance · monthly snapshot and fiscal-year average"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <VitalSignCard
            title="Church-wide · Monthly"
            reading={data.attendance.churchWide.monthly}
          />
          <VitalSignCard
            title={`Church-wide · ${data.fiscalYearLabel}`}
            reading={data.attendance.churchWide.fiscalYear}
          />
        </div>
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-base-content/60">
                <th>Campus</th>
                <th className="text-right">Monthly</th>
                <th className="text-right">{data.fiscalYearLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.attendance.byCampus.map((campus) => (
                <tr key={campus.campusId}>
                  <td className="font-medium">{campus.campusName}</td>
                  <td className="text-right tabular-nums">
                    {campus.monthly.hasData && campus.monthly.value != null
                      ? campus.monthly.value.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </td>
                  <td className="text-right tabular-nums">
                    {campus.fiscalYear.hasData && campus.fiscalYear.value != null
                      ? campus.fiscalYear.value.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-base-content/50">
          Monthly column: {data.latestMonthLabel}
        </p>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Kids Attendance"
          description="Kids ÷ (Kids + Adults) at church-wide; per campus uses kids ÷ total in-person"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <VitalSignCard
            title="Church-wide · Monthly kids"
            reading={data.kids.churchWide.monthly}
          />
          <VitalSignCard
            title={`Church-wide · ${data.fiscalYearLabel} kids`}
            reading={data.kids.churchWide.fiscalYear}
          />
          <VitalSignCard
            title="Church-wide · Monthly %"
            reading={data.kids.churchWide.monthlyPct}
            unit="percent"
          />
          <VitalSignCard
            title={`Church-wide · ${data.fiscalYearLabel} %`}
            reading={data.kids.churchWide.fiscalYearPct}
            unit="percent"
          />
        </div>
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-base-content/60">
                <th>Campus</th>
                <th className="text-right">Monthly kids</th>
                <th className="text-right">{data.fiscalYearLabel} kids</th>
                <th className="text-right">Monthly %</th>
                <th className="text-right">{data.fiscalYearLabel} %</th>
              </tr>
            </thead>
            <tbody>
              {data.kids.byCampus.map((campus) => (
                <tr key={campus.campusId}>
                  <td className="font-medium">{campus.campusName}</td>
                  <td className="text-right tabular-nums">
                    {campus.monthly.hasData && campus.monthly.value != null
                      ? campus.monthly.value.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </td>
                  <td className="text-right tabular-nums">
                    {campus.fiscalYear.hasData && campus.fiscalYear.value != null
                      ? campus.fiscalYear.value.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </td>
                  <td className="text-right tabular-nums">
                    {campus.monthlyPct.hasData && campus.monthlyPct.value != null
                      ? `${campus.monthlyPct.value.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="text-right tabular-nums">
                    {campus.fiscalYearPct.hasData &&
                    campus.fiscalYearPct.value != null
                      ? `${campus.fiscalYearPct.value.toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Serving"
          description="Current volunteers from Volunteer Matrix, summed by campus"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <VitalSignCard
            title="Total People Serving"
            reading={data.serving.total}
            subtitleItalic
          />
          <VitalSignCard
            title="% of Church Serving"
            reading={data.serving.pct}
            unit="percent"
          />
        </div>
        {!campusId && data.serving.byCampus.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Campus</th>
                  <th className="text-right">People serving</th>
                </tr>
              </thead>
              <tbody>
                {data.serving.byCampus.map((campus) => (
                  <tr key={campus.campusId}>
                    <td>{campus.campusName}</td>
                    <td className="text-right tabular-nums">
                      {campus.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading title="Small Groups" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <VitalSignCard
            title="% Participating in a Small Group"
            reading={data.groups.participationPct}
            unit="percent"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Baptisms"
          description="FY26/27 signups from Baptism and Kids Baptism tabs since May 1, 2026"
        />
        <BaptismsPanel data={data.baptisms.connectEvents} />
      </section>
    </div>
  );
}
