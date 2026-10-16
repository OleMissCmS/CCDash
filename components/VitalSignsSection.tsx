import { BaptismsPanel } from "@/components/BaptismsPanel";
import { AttendanceCalendarYearTrendChart } from "@/components/Charts";
import { VitalSignCard } from "@/components/VitalSignCard";
import { createClient } from "@/lib/supabase/server";
import {
  getAttendanceCalendarYearTrend,
  getCampuses,
} from "@/lib/metrics";
import { getVitalSignsData } from "@/lib/vital-signs";

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="sfdc-section-heading">
      <h2 className="sfdc-section-heading__title">{title}</h2>
      {description && (
        <p className="sfdc-section-heading__description">{description}</p>
      )}
    </div>
  );
}

export async function VitalSignsSection({
  campusId = null,
  visibleCampusIds = null,
}: {
  campusId?: string | null;
  visibleCampusIds?: string[] | null;
}) {
  const supabase = await createClient();
  const campuses = await getCampuses(supabase);
  const [data, attendanceTrend] = await Promise.all([
    getVitalSignsData(supabase, campuses, campusId),
    getAttendanceCalendarYearTrend(supabase, campusId),
  ]);
  const attendanceScopeLabel =
    campuses.find((campus) => campus.id === campusId)?.name ?? "Church-wide";

  const campusAttendance = campusId
    ? data.attendance.byCampus.find((campus) => campus.campusId === campusId)
    : undefined;
  const campusKids = campusId
    ? data.kids.byCampus.find((campus) => campus.campusId === campusId)
    : undefined;

  const attendanceCards = campusAttendance
    ? {
        monthly: campusAttendance.monthly,
        fiscalYear: {
          ...campusAttendance.fiscalYear,
          subtitle: `Avg weekly · ${data.fiscalYearLabel}`,
        },
      }
    : data.attendance.churchWide;
  const kidsCards = campusKids
    ? {
        monthly: campusKids.monthly,
        yearOverYearKids: campusKids.yearOverYearKids,
        monthlyPct: campusKids.monthlyPct,
        yearOverYearPct: campusKids.yearOverYearPct,
      }
    : data.kids.churchWide;
  const kidsPctDescription = campusKids
    ? "% uses kids ÷ total in-person"
    : "church-wide % uses kids ÷ (kids + adults); per campus uses kids ÷ total in-person";
  const isVisibleCampus = (row: { campusId: string }) =>
    visibleCampusIds == null || visibleCampusIds.includes(row.campusId);
  const attendanceRows = data.attendance.byCampus.filter(isVisibleCampus);
  const kidsRows = data.kids.byCampus.filter(isVisibleCampus);
  const servingRows = data.serving.byCampus.filter(isVisibleCampus);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeading
          title="Average Attendance"
          description={`Avg weekly in-person attendance for ${data.latestMonthLabel} and fiscal-year average`}
        />
        <div className="sfdc-grid sfdc-grid--2">
          <VitalSignCard
            title={`${attendanceScopeLabel} · ${data.latestMonthLabel}`}
            reading={attendanceCards.monthly}
          />
          <VitalSignCard
            title={`${attendanceScopeLabel} · ${data.fiscalYearLabel}`}
            reading={attendanceCards.fiscalYear}
          />
        </div>
        {attendanceTrend.length > 0 && (
          <AttendanceCalendarYearTrendChart
            data={attendanceTrend}
            title="Monthly average attendance (calendar year)"
            subtitle={`${attendanceScopeLabel} · Current year and previous 3 years · Sunday Attendance sheet`}
          />
        )}
        {attendanceRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-base-content/60">
                <th>Campus</th>
                <th className="text-right">{data.latestMonthLabel}</th>
                <th className="text-right">{data.fiscalYearLabel}</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRows.map((campus) => (
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
        )}
        <p className="text-xs text-base-content/50">
          Monthly column uses the previous calendar month ({data.latestMonthLabel})
        </p>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Kids Attendance"
          description={`Kids metrics for ${data.latestMonthLabel} · ${kidsPctDescription}`}
        />
        <div className="sfdc-grid sfdc-grid--2">
          <VitalSignCard
            className="sfdc-vital-sign-card"
            title={`${attendanceScopeLabel} · ${data.latestMonthLabel} kids`}
            reading={kidsCards.monthly}
          />
          <VitalSignCard
            className="sfdc-vital-sign-card"
            title={`${attendanceScopeLabel} · Kids YoY`}
            reading={kidsCards.yearOverYearKids}
          />
          <VitalSignCard
            className="sfdc-vital-sign-card"
            title={`${attendanceScopeLabel} · ${data.latestMonthLabel} %`}
            reading={kidsCards.monthlyPct}
            unit="percent"
          />
          <VitalSignCard
            className="sfdc-vital-sign-card"
            title={`${attendanceScopeLabel} · % YoY`}
            reading={kidsCards.yearOverYearPct}
            unit="percent"
          />
        </div>
        {kidsRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-base-content/60">
                <th>Campus</th>
                <th className="text-right">{data.latestMonthLabel} kids</th>
                <th className="text-right">{data.fiscalYearLabel} kids</th>
                <th className="text-right">{data.latestMonthLabel} %</th>
                <th className="text-right">{data.fiscalYearLabel} %</th>
              </tr>
            </thead>
            <tbody>
              {kidsRows.map((campus) => (
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
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Serving"
          description="Current volunteers from Volunteer Matrix, summed by campus"
        />
        <div className="sfdc-grid sfdc-grid--2">
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
        {!campusId && servingRows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Campus</th>
                  <th className="text-right">People serving</th>
                </tr>
              </thead>
              <tbody>
                {servingRows.map((campus) => (
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
        <div className="sfdc-grid sfdc-grid--2">
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
