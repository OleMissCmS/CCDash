import type { SupabaseClient } from "@supabase/supabase-js";
import { getConnectEventsBaptismsForCampus } from "./connect-events";
import type { ConnectEventsBaptismSummary } from "./google-sheets-connect-events";
import { getFiscalYearMonthlyBounds, getPreviousCalendarMonthStart } from "./periods";
import {
  getAnnualSnapshots,
  getMonthlySnapshotsInRange,
} from "./metrics";
import { CALENDAR_YEAR } from "./periods";
import {
  buildAttendanceAggregates,
  fetchParsedAttendanceYears,
  type AttendanceCampusSlug,
  type MonthlyAttendanceAggregate,
} from "./google-sheets-attendance";
import { fetchVolunteerMatrixCampuses } from "./google-sheets-volunteer-matrix";
import type { VolunteerCampusSlug } from "./google-sheets-volunteer-matrix";
import type { Campus } from "./types";
import { DEFAULT_FISCAL_YEAR } from "./types";

export type VitalSignReading = {
  value: number | null;
  subtitle?: string;
  hasData: boolean;
  displayValue?: string;
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
  yearOverYearKids: VitalSignReading;
  yearOverYearPct: VitalSignReading;
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
      yearOverYearKids: VitalSignReading;
      yearOverYearPct: VitalSignReading;
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

function priorYearSameMonth(periodStart: string): string {
  const date = new Date(`${periodStart}T12:00:00`);
  const year = date.getFullYear() - 1;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function formatYearOverYearChange(current: number, prior: number): string | null {
  if (prior === 0) return null;
  const pctChange = ((current - prior) / prior) * 100;
  if (Math.abs(pctChange) < 0.05) return "No change";
  const rounded = Math.abs(pctChange)
    .toFixed(1)
    .replace(/\.0$/, "");
  return pctChange > 0
    ? `${rounded}% increase`
    : `${rounded}% decrease`;
}

function yearOverYearReading(
  current: number | null,
  prior: number | null,
  priorMonthLabel: string,
  formatPrior: (value: number) => string
): VitalSignReading {
  if (current == null || prior == null) {
    return placeholderReading();
  }

  const displayValue = formatYearOverYearChange(current, prior);
  if (!displayValue) {
    return placeholderReading();
  }

  return {
    value: ((current - prior) / prior) * 100,
    hasData: true,
    displayValue,
    subtitle: `${formatPrior(prior)} · ${priorMonthLabel}`,
  };
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

function attendanceCampusSlug(campus: Campus): AttendanceCampusSlug | null {
  if (
    campus.slug === "mount-pleasant" ||
    campus.slug === "alma" ||
    campus.slug === "st-johns"
  ) {
    return campus.slug;
  }
  return null;
}

function churchAttendanceValue(
  targetMonth: string,
  sheetMonth: MonthlyAttendanceAggregate | undefined,
  attendanceMonthly: Array<{
    period_start: string;
    value: number;
    campus_id: string | null;
    source?: string;
  }>,
  campusId: string | null,
  campusSlug: AttendanceCampusSlug | null
): { value: number | null; fromSheets: boolean } {
  if (campusSlug && sheetMonth?.campuses[campusSlug]?.total != null) {
    return { value: sheetMonth.campuses[campusSlug].total, fromSheets: true };
  }

  if (!campusId && sheetMonth?.inPersonTotal != null) {
    return { value: sheetMonth.inPersonTotal, fromSheets: true };
  }

  const dbValue = valueAtPeriod(attendanceMonthly, targetMonth, campusId);
  const fromSheets = attendanceMonthly.some(
    (row) =>
      row.period_start === targetMonth &&
      (campusId ? row.campus_id === campusId : row.campus_id == null) &&
      row.source === "google_sheets"
  );

  return { value: dbValue, fromSheets };
}

function campusKidsValue(
  targetMonth: string,
  sheetMonth: MonthlyAttendanceAggregate | undefined,
  kidsMonthly: Array<{
    period_start: string;
    value: number;
    campus_id: string | null;
    source?: string;
  }>,
  campusId: string,
  campusSlug: AttendanceCampusSlug | null
): { value: number | null; fromSheets: boolean } {
  if (campusSlug && sheetMonth?.campuses[campusSlug]?.kids != null) {
    return { value: sheetMonth.campuses[campusSlug].kids, fromSheets: true };
  }

  if (
    campusSlug &&
    sheetMonth?.churchKidsTotal != null &&
    sheetMonth.campuses[campusSlug]?.total != null &&
    sheetMonth.inPersonTotal != null &&
    sheetMonth.inPersonTotal > 0
  ) {
    const share =
      sheetMonth.campuses[campusSlug].total / sheetMonth.inPersonTotal;
    return {
      value: sheetMonth.churchKidsTotal * share,
      fromSheets: true,
    };
  }

  const dbValue = valueAtPeriod(kidsMonthly, targetMonth, campusId);
  const fromSheets = kidsMonthly.some(
    (row) =>
      row.period_start === targetMonth &&
      row.campus_id === campusId &&
      row.source === "google_sheets"
  );

  return { value: dbValue, fromSheets };
}

function churchKidsValue(
  targetMonth: string,
  sheetMonth: MonthlyAttendanceAggregate | undefined,
  kidsMonthly: Array<{
    period_start: string;
    value: number;
    campus_id: string | null;
    source?: string;
  }>
): { value: number | null; fromSheets: boolean } {
  if (sheetMonth?.churchKidsTotal != null) {
    return { value: sheetMonth.churchKidsTotal, fromSheets: true };
  }

  const dbValue = valueAtPeriod(kidsMonthly, targetMonth, null);
  const fromSheets = kidsMonthly.some(
    (row) =>
      row.period_start === targetMonth &&
      row.campus_id == null &&
      row.source === "google_sheets"
  );

  return { value: dbValue, fromSheets };
}

function churchAdultsValue(
  targetMonth: string,
  sheetMonth: MonthlyAttendanceAggregate | undefined,
  adultsMonthly: Array<{
    period_start: string;
    value: number;
    campus_id: string | null;
    source?: string;
  }>
): { value: number | null; fromSheets: boolean } {
  if (sheetMonth?.inPersonAdultsTotal != null) {
    return { value: sheetMonth.inPersonAdultsTotal, fromSheets: true };
  }

  const dbValue = valueAtPeriod(adultsMonthly, targetMonth, null);
  const fromSheets = adultsMonthly.some(
    (row) =>
      row.period_start === targetMonth &&
      row.campus_id == null &&
      row.source === "google_sheets"
  );

  return { value: dbValue, fromSheets };
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
    getConnectEventsBaptismsForCampus(campusId ?? null, campuses),
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

  const targetMonth = getPreviousCalendarMonthStart();
  const latestMonthLabel = formatMonthLabel(targetMonth);

  let sheetMonth: MonthlyAttendanceAggregate | undefined;
  let priorSheetMonth: MonthlyAttendanceAggregate | undefined;
  try {
    const currentYear = new Date().getFullYear();
    const sundays = await fetchParsedAttendanceYears([
      currentYear - 1,
      currentYear,
    ]);
    if (sundays.length > 0) {
      const { monthly } = buildAttendanceAggregates(sundays);
      const sheetMonthlyByPeriod = new Map(
        monthly.map((month) => [month.periodStart, month])
      );
      sheetMonth = sheetMonthlyByPeriod.get(targetMonth);
      priorSheetMonth = sheetMonthlyByPeriod.get(priorYearSameMonth(targetMonth));
    }
  } catch {
    // Fall back to synced monthly snapshots below.
  }

  const priorYearMonth = priorYearSameMonth(targetMonth);

  const churchAttendance = churchAttendanceValue(
    targetMonth,
    sheetMonth,
    attendanceMonthly,
    null,
    null
  );
  const churchMonthlyAttendance = churchAttendance.value;
  const churchMonthlyFromSheets = churchAttendance.fromSheets;

  const churchAdults = churchAdultsValue(
    targetMonth,
    sheetMonth,
    adultsMonthly
  );
  const churchMonthlyAdults = churchAdults.value;

  const churchMonthlyKidsReading = churchKidsValue(
    targetMonth,
    sheetMonth,
    kidsMonthly
  );
  const churchMonthlyKids = churchMonthlyKidsReading.value;
  const churchKidsFromSheets = churchMonthlyKidsReading.fromSheets;
  const churchMonthlyKidsPct =
    churchMonthlyKids != null && churchMonthlyAdults != null
      ? kidsSharePct(churchMonthlyKids, churchMonthlyAdults)
      : null;

  const churchFyAttendance = annualValue(attendanceAnnual, null);

  const churchFyKids = sum(
    campuses
      .map((campus) => annualValue(kidsAnnual, campus.id).value)
      .filter((value): value is number => value != null)
  );
  const churchFyAdults = annualValue(adultsAnnual, null).value;
  const churchFyKidsPct =
    churchFyAdults != null ? kidsSharePct(churchFyKids, churchFyAdults) : null;

  const priorYearMonthLabel = formatMonthLabel(priorYearMonth);

  const priorChurchKidsReading = churchKidsValue(
    priorYearMonth,
    priorSheetMonth,
    kidsMonthly
  );
  const churchPriorYearKids = priorChurchKidsReading.value;
  const churchPriorYearKidsHasData = churchPriorYearKids != null;

  const priorYearAdults = churchAdultsValue(
    priorYearMonth,
    priorSheetMonth,
    adultsMonthly
  );
  const churchPriorYearAdults = priorYearAdults.value;
  const churchPriorYearKidsPct =
    churchPriorYearKidsHasData && churchPriorYearAdults != null
      ? kidsSharePct(churchPriorYearKids, churchPriorYearAdults)
      : null;

  const churchMonthlyKidsHasData = churchMonthlyKids != null;

  const churchYearOverYearKids = yearOverYearReading(
    churchMonthlyKidsHasData ? churchMonthlyKids : null,
    churchPriorYearKidsHasData ? churchPriorYearKids : null,
    priorYearMonthLabel,
    (value) => value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  );

  const churchYearOverYearPct = yearOverYearReading(
    churchMonthlyKidsPct,
    churchPriorYearKidsPct,
    priorYearMonthLabel,
    (value) => `${value.toFixed(1)}%`
  );

  const byCampusAttendance: CampusAttendanceReading[] = campuses.map(
    (campus) => {
      const slug = attendanceCampusSlug(campus);
      const monthlyAttendance = churchAttendanceValue(
        targetMonth,
        sheetMonth,
        attendanceMonthly,
        campus.id,
        slug
      );
      const fyValue = annualValue(attendanceAnnual, campus.id);

      return {
        campusId: campus.id,
        campusName: campus.name,
        monthly: reading(
          monthlyAttendance.value,
          monthlyAttendance.value != null && monthlyAttendance.fromSheets,
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
    const slug = attendanceCampusSlug(campus);
    const monthlyKids = campusKidsValue(
      targetMonth,
      sheetMonth,
      kidsMonthly,
      campus.id,
      slug
    );
    const monthlyAttendance = churchAttendanceValue(
      targetMonth,
      sheetMonth,
      attendanceMonthly,
      campus.id,
      slug
    );
    const monthlyPct =
      monthlyKids.value != null && monthlyAttendance.value != null
        ? campusKidsPct(monthlyKids.value, monthlyAttendance.value)
        : null;

    const fyKids = annualValue(kidsAnnual, campus.id);
    const fyTotal = annualValue(attendanceAnnual, campus.id);
    const fyPct =
      fyKids.value != null && fyTotal.value != null
        ? campusKidsPct(fyKids.value, fyTotal.value)
        : null;

    const hasKidsData =
      monthlyKids.fromSheets ||
      monthlyAttendance.fromSheets ||
      fyKids.fromSheets ||
      fyTotal.fromSheets;

    const priorKids = campusKidsValue(
      priorYearMonth,
      priorSheetMonth,
      kidsMonthly,
      campus.id,
      slug
    ).value;
    const priorAttendance = churchAttendanceValue(
      priorYearMonth,
      priorSheetMonth,
      attendanceMonthly,
      campus.id,
      slug
    ).value;
    const priorPct =
      priorKids != null && priorAttendance != null
        ? campusKidsPct(priorKids, priorAttendance)
        : null;

    return {
      campusId: campus.id,
      campusName: campus.name,
      monthly: reading(
        monthlyKids.value,
        monthlyKids.value != null && hasKidsData,
        latestMonthLabel
      ),
      fiscalYear: reading(
        fyKids.value,
        fyKids.value != null && hasKidsData,
        DEFAULT_FISCAL_YEAR
      ),
      monthlyPct: reading(
        monthlyPct,
        monthlyPct != null && hasKidsData,
        latestMonthLabel
      ),
      fiscalYearPct: reading(
        fyPct,
        fyPct != null && hasKidsData,
        DEFAULT_FISCAL_YEAR
      ),
      yearOverYearKids: yearOverYearReading(
        monthlyKids.value,
        priorKids,
        priorYearMonthLabel,
        (value) => value.toLocaleString(undefined, { maximumFractionDigits: 0 })
      ),
      yearOverYearPct: yearOverYearReading(
        monthlyPct,
        priorPct,
        priorYearMonthLabel,
        (value) => `${value.toFixed(1)}%`
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
    ? churchAttendanceValue(
        targetMonth,
        sheetMonth,
        attendanceMonthly,
        selectedCampus.id,
        attendanceCampusSlug(selectedCampus)
      ).value
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
          churchMonthlyKidsHasData && churchKidsFromSheets,
          latestMonthLabel
        ),
        fiscalYear: reading(
          churchFyKids,
          churchFyAttendance.fromSheets,
          `Avg weekly · ${DEFAULT_FISCAL_YEAR}`
        ),
        monthlyPct: reading(
          churchMonthlyKidsPct,
          churchMonthlyKidsPct != null && churchKidsFromSheets,
          latestMonthLabel
        ),
        fiscalYearPct: reading(
          churchFyKidsPct,
          churchFyKidsPct != null && churchFyAttendance.fromSheets,
          DEFAULT_FISCAL_YEAR
        ),
        yearOverYearKids: churchYearOverYearKids,
        yearOverYearPct: churchYearOverYearPct,
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
