import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchConnectEventsBaptisms } from "./google-sheets-connect-events";
import type { ConnectEventsBaptismSummary } from "./google-sheets-connect-events";
import { getFiscalYearMonthlyBounds } from "./periods";
import {
  getAnnualSnapshots,
  getMonthlySnapshotsInRange,
} from "./metrics";
import { CALENDAR_YEAR } from "./periods";
import { fetchVolunteerMatrixCampuses } from "./google-sheets-volunteer-matrix";
import type { VolunteerCampusSlug } from "./google-sheets-volunteer-matrix";
import type { Campus } from "./types";
import { DEFAULT_FISCAL_YEAR } from "./types";

export type VitalSignReading = {
  value: number | null;
  subtitle?: string;
  hasData: boolean;
};

export type CampusAttendanceReading = {
  campusId: string;
  campusName: string;
  monthly: VitalSignReading;
  fiscalYear: VitalSignReading;
};

export type CampusKidsReading = {
  campusId: string;
  campusName: string;
  monthly: VitalSignReading;
  fiscalYear: VitalSignReading;
  monthlyPct: VitalSignReading;
  fiscalYearPct: VitalSignReading;
};

export type VitalSignsData = {
  latestMonthLabel: string;
  fiscalYearLabel: string;
  attendance: {
    churchWide: {
      monthly: VitalSignReading;
      fiscalYear: VitalSignReading;
    };
    byCampus: CampusAttendanceReading[];
  };
  kids: {
    churchWide: {
      monthly: VitalSignReading;
      fiscalYear: VitalSignReading;
      monthlyPct: VitalSignReading;
      fiscalYearPct: VitalSignReading;
    };
    byCampus: CampusKidsReading[];
  };
  serving: {
    total: VitalSignReading;
    pct: VitalSignReading;
    byCampus: Array<{
      campusId: string;
      campusName: string;
      total: number;
    }>;
  };
  groups: {
    participationPct: VitalSignReading;
  };
  baptisms: {
    fiscalYear: VitalSignReading;
    calendarYear: VitalSignReading;
    connectEvents: ConnectEventsBaptismSummary;
  };
};

const PLACEHOLDER_MESSAGE =
  "Data not yet connected — add a source or manual entry";

function formatMonthLabel(periodStart: string): string {
  const date = new Date(`${periodStart}T12:00:00`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function kidsSharePct(kids: number, adults: number): number | null {
  const total = kids + adults;
  if (total <= 0) return null;
  return (kids / total) * 100;
}

function campusKidsPct(kids: number, totalInPerson: number): number | null {
  if (totalInPerson <= 0) return null;
  return (kids / totalInPerson) * 100;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function reading(
  value: number | null,
  hasData: boolean,
  subtitle?: string
): VitalSignReading {
  return { value, hasData, subtitle };
}

function placeholderReading(message = PLACEHOLDER_MESSAGE): VitalSignReading {
  return { value: null, hasData: false, subtitle: message };
}

function latestPeriodStart(
  rows: Array<{ period_start: string }>
): string | null {
  if (rows.length === 0) return null;
  return rows.reduce(
    (latest, row) => (row.period_start > latest ? row.period_start : latest),
    rows[0].period_start
  );
}

function valueAtPeriod(
  rows: Array<{ period_start: string; value: number; campus_id: string | null }>,
  periodStart: string,
  campusId: string | null
): number | null {
  const match = rows.find(
    (row) =>
      row.period_start === periodStart &&
      (campusId ? row.campus_id === campusId : row.campus_id == null)
  );
  return match?.value ?? null;
}

function annualValue(
  rows: Array<{
    fiscal_year: string | null;
    value: number;
    campus_id: string | null;
    source: string;
  }>,
  campusId: string | null
): { value: number | null; fromSheets: boolean } {
  const match = rows.find(
    (row) =>
      row.fiscal_year === DEFAULT_FISCAL_YEAR &&
      (campusId ? row.campus_id === campusId : row.campus_id == null)
  );
  if (!match) return { value: null, fromSheets: false };
  return {
    value: match.value,
    fromSheets: match.source === "google_sheets",
  };
}

function campusSlugToVolunteerSlug(slug: string): VolunteerCampusSlug | null {
  if (slug === "mount-pleasant" || slug === "alma" || slug === "st-johns") {
    return slug;
  }
  return null;
}

function servingPct(
  servingTotal: number,
  monthlyAttendance: number | null
): number | null {
  if (monthlyAttendance == null || monthlyAttendance <= 0) return null;
  return (servingTotal / monthlyAttendance) * 100;
}

export async function getVitalSignsData(
  supabase: SupabaseClient,
  campuses: Campus[],
  campusId?: string | null
): Promise<VitalSignsData> {
  const fyBounds = getFiscalYearMonthlyBounds(DEFAULT_FISCAL_YEAR);

  const [monthlyRows, annualRows, connectEvents, volunteerMatrix] = await Promise.all([
    getMonthlySnapshotsInRange(supabase, fyBounds.start, "2099-12-01"),
    getAnnualSnapshots(supabase, DEFAULT_FISCAL_YEAR),
    fetchConnectEventsBaptisms(),
    fetchVolunteerMatrixCampuses(),
  ]);

  const attendanceMonthly = monthlyRows.filter(
    (row) => row.metric?.key === "total_in_person_avg"
  );
  const kidsMonthly = monthlyRows.filter((row) => row.metric?.key === "kids_avg");
  const adultsMonthly = monthlyRows.filter(
    (row) => row.metric?.key === "adult_worship_avg"
  );

  const attendanceAnnual = annualRows.filter(
    (row) => row.metric?.key === "total_in_person_avg"
  );
  const kidsAnnual = annualRows.filter((row) => row.metric?.key === "kids_avg");
  const adultsAnnual = annualRows.filter(
    (row) => row.metric?.key === "adult_worship_avg"
  );

  const latestMonth = latestPeriodStart(attendanceMonthly);
  const latestMonthLabel = latestMonth
    ? formatMonthLabel(latestMonth)
    : "Latest month";

  const churchMonthlyAttendance =
    latestMonth != null
      ? valueAtPeriod(attendanceMonthly, latestMonth, null)
      : null;
  const churchMonthlyFromSheets = attendanceMonthly.some(
    (row) =>
      row.source === "google_sheets" &&
      row.period_start === latestMonth &&
      row.campus_id == null
  );

  const churchFyAttendance = annualValue(attendanceAnnual, null);

  const churchMonthlyKids =
    latestMonth != null
      ? sum(
          campuses
            .map((campus) =>
              valueAtPeriod(kidsMonthly, latestMonth, campus.id)
            )
            .filter((value): value is number => value != null)
        )
      : 0;
  const churchMonthlyAdults =
    latestMonth != null ? valueAtPeriod(adultsMonthly, latestMonth, null) : null;
  const churchMonthlyKidsPct =
    churchMonthlyAdults != null
      ? kidsSharePct(churchMonthlyKids, churchMonthlyAdults)
      : null;

  const churchFyKids = sum(
    campuses
      .map((campus) => annualValue(kidsAnnual, campus.id).value)
      .filter((value): value is number => value != null)
  );
  const churchFyAdults = annualValue(adultsAnnual, null).value;
  const churchFyKidsPct =
    churchFyAdults != null ? kidsSharePct(churchFyKids, churchFyAdults) : null;

  const byCampusAttendance: CampusAttendanceReading[] = campuses.map(
    (campus) => {
      const monthlyValue =
        latestMonth != null
          ? valueAtPeriod(attendanceMonthly, latestMonth, campus.id)
          : null;
      const monthlyRow = attendanceMonthly.find(
        (row) =>
          row.period_start === latestMonth && row.campus_id === campus.id
      );
      const fyValue = annualValue(attendanceAnnual, campus.id);

      return {
        campusId: campus.id,
        campusName: campus.name,
        monthly: reading(
          monthlyValue,
          monthlyValue != null && monthlyRow?.source === "google_sheets",
          latestMonthLabel
        ),
        fiscalYear: reading(
          fyValue.value,
          fyValue.value != null && fyValue.fromSheets,
          DEFAULT_FISCAL_YEAR
        ),
      };
    }
  );

  const byCampusKids: CampusKidsReading[] = campuses.map((campus) => {
    const monthlyKids =
      latestMonth != null
        ? valueAtPeriod(kidsMonthly, latestMonth, campus.id)
        : null;
    const monthlyTotal =
      latestMonth != null
        ? valueAtPeriod(attendanceMonthly, latestMonth, campus.id)
        : null;
    const monthlyPct =
      monthlyKids != null && monthlyTotal != null
        ? campusKidsPct(monthlyKids, monthlyTotal)
        : null;

    const fyKids = annualValue(kidsAnnual, campus.id);
    const fyTotal = annualValue(attendanceAnnual, campus.id);
    const fyPct =
      fyKids.value != null && fyTotal.value != null
        ? campusKidsPct(fyKids.value, fyTotal.value)
        : null;

    const hasKidsData = fyKids.fromSheets || fyTotal.fromSheets;

    return {
      campusId: campus.id,
      campusName: campus.name,
      monthly: reading(
        monthlyKids,
        monthlyKids != null && hasKidsData,
        latestMonthLabel
      ),
      fiscalYear: reading(
        fyKids.value,
        fyKids.value != null && hasKidsData,
        DEFAULT_FISCAL_YEAR
      ),
      monthlyPct: reading(monthlyPct, monthlyPct != null && hasKidsData, latestMonthLabel),
      fiscalYearPct: reading(
        fyPct,
        fyPct != null && hasKidsData,
        DEFAULT_FISCAL_YEAR
      ),
    };
  });

  const baptismsFyTotal = connectEvents.fiscalYearTotal;
  const baptismsFromIntegratedSource = connectEvents.source === "google_sheets";

  const selectedCampus = campusId
    ? campuses.find((campus) => campus.id === campusId) ?? null
    : null;
  const selectedVolunteerSlug = selectedCampus
    ? campusSlugToVolunteerSlug(selectedCampus.slug)
    : null;

  const servingByCampus = campuses
    .map((campus) => {
      const volunteerSlug = campusSlugToVolunteerSlug(campus.slug);
      const matrixCampus = volunteerSlug
        ? volunteerMatrix.campuses.find((item) => item.slug === volunteerSlug)
        : null;
      return {
        campusId: campus.id,
        campusName: campus.name,
        total: matrixCampus?.totals.current ?? 0,
      };
    })
    .filter((campus) => campus.total > 0 || volunteerMatrix.source === "google_sheets");

  const churchWideServing = volunteerMatrix.campuses.reduce(
    (sum, campus) => sum + campus.totals.current,
    0
  );
  const servingTotal = selectedVolunteerSlug
    ? volunteerMatrix.campuses.find((campus) => campus.slug === selectedVolunteerSlug)
        ?.totals.current ?? 0
    : churchWideServing;

  const monthlyAttendanceForServing = selectedCampus
    ? latestMonth != null
      ? valueAtPeriod(attendanceMonthly, latestMonth, selectedCampus.id)
      : null
    : churchMonthlyAttendance;

  const servingFromSheets = volunteerMatrix.source === "google_sheets";
  const servingPctValue = servingPct(servingTotal, monthlyAttendanceForServing);
  const servingScopeLabel = selectedCampus?.name ?? "Church-wide";
  const servingSubtitle = monthlyAttendanceForServing != null
    ? `${servingTotal.toLocaleString()} serving · ${monthlyAttendanceForServing.toLocaleString()} avg attendance · ${servingScopeLabel} · ${latestMonthLabel}`
    : `Volunteer matrix · ${servingScopeLabel}`;

  return {
    latestMonthLabel,
    fiscalYearLabel: DEFAULT_FISCAL_YEAR,
    attendance: {
      churchWide: {
        monthly: reading(
          churchMonthlyAttendance,
          churchMonthlyAttendance != null && churchMonthlyFromSheets,
          latestMonthLabel
        ),
        fiscalYear: reading(
          churchFyAttendance.value,
          churchFyAttendance.value != null && churchFyAttendance.fromSheets,
          `Avg weekly · ${DEFAULT_FISCAL_YEAR}`
        ),
      },
      byCampus: byCampusAttendance,
    },
    kids: {
      churchWide: {
        monthly: reading(
          churchMonthlyKids,
          churchMonthlyFromSheets && latestMonth != null,
          latestMonthLabel
        ),
        fiscalYear: reading(
          churchFyKids,
          churchFyAttendance.fromSheets,
          `Avg weekly · ${DEFAULT_FISCAL_YEAR}`
        ),
        monthlyPct: reading(
          churchMonthlyKidsPct,
          churchMonthlyKidsPct != null && churchMonthlyFromSheets,
          latestMonthLabel
        ),
        fiscalYearPct: reading(
          churchFyKidsPct,
          churchFyKidsPct != null && churchFyAttendance.fromSheets,
          DEFAULT_FISCAL_YEAR
        ),
      },
      byCampus: byCampusKids,
    },
    serving: {
      total: reading(
        servingTotal,
        servingFromSheets,
        servingFromSheets
          ? "from volunteer matrix"
          : PLACEHOLDER_MESSAGE
      ),
      pct: reading(
        servingPctValue,
        servingPctValue != null && servingFromSheets && monthlyAttendanceForServing != null,
        servingSubtitle
      ),
      byCampus: servingByCampus,
    },
    groups: {
      participationPct: placeholderReading(),
    },
    baptisms: {
      fiscalYear: baptismsFromIntegratedSource
        ? reading(
            baptismsFyTotal,
            true,
            `${connectEvents.sinceLabel} · ${connectEvents.fiscalYearLabel}`
          )
        : reading(
            baptismsFyTotal,
            baptismsFyTotal > 0,
            baptismsFyTotal > 0
              ? `Sample data (${baptismsFyTotal}) — share connect events sheet`
              : PLACEHOLDER_MESSAGE
          ),
      calendarYear: baptismsFromIntegratedSource
        ? reading(
            baptismsFyTotal,
            true,
            connectEvents.sinceLabel
          )
        : reading(
            baptismsFyTotal,
            baptismsFyTotal > 0,
            baptismsFyTotal > 0
              ? `Sample data (${baptismsFyTotal}) — share connect events sheet`
              : PLACEHOLDER_MESSAGE
          ),
      connectEvents,
    },
  };
}
