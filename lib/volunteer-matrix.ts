import type { Campus } from "./types";
import {
  ministryAreaSlugFromSheetName,
  VOLUNTEER_MATRIX_MINISTRY_AREAS,
  volunteerMatrixMinistryAreaLabel,
  type VolunteerMatrixMinistryAreaSlug,
} from "./volunteer-matrix-areas";
import {
  aggregateVolunteerMatrixTotals,
  filterVolunteerMatrixByCampusSlug,
  filterVolunteerMatrixByMinistryArea,
  fetchVolunteerMatrixCampuses,
  VOLUNTEER_MATRIX_CAMPUS_TABS,
  type VolunteerCampusSlug,
  type VolunteerMatrixCampusData,
  type VolunteerMatrixCampusTotals,
} from "./google-sheets-volunteer-matrix";

export type VolunteerMatrixView = {
  campuses: VolunteerMatrixCampusData[];
  /** Campus-scoped sheet data for breakdown filters (all ministry areas). */
  breakdownCampuses: VolunteerMatrixCampusData[];
  totals: VolunteerMatrixCampusTotals;
  campusSlug: VolunteerCampusSlug | null;
  campusLabel: string;
  ministryAreaSlug: VolunteerMatrixMinistryAreaSlug | null;
  ministryAreaLabel: string;
  filterLabel: string;
  areaSummaries: VolunteerMatrixAreaSummary[];
  source: "google_sheets" | "sample";
  warnings: string[];
  fetchedAt: string;
};

/** Map database campus slugs to volunteer matrix sheet slugs. */
const CAMPUS_SLUG_ALIASES: Record<string, VolunteerCampusSlug> = {
  "mount-pleasant": "mount-pleasant",
  "mt-pleasant": "mount-pleasant",
  alma: "alma",
  "st-johns": "st-johns",
};

export function resolveVolunteerMatrixCampusSlug(
  campuses: Campus[],
  campusParam: string | null | undefined
): VolunteerCampusSlug | null {
  if (!campusParam || campusParam === "all") return null;

  const bySheetSlug = VOLUNTEER_MATRIX_CAMPUS_TABS.find(
    (campus) => campus.slug === campusParam
  );
  if (bySheetSlug) return bySheetSlug.slug;

  const campus = campuses.find((item) => item.id === campusParam);
  if (!campus) return null;
  return CAMPUS_SLUG_ALIASES[campus.slug] ?? null;
}

export function volunteerMatrixCampusLabel(
  slug: VolunteerCampusSlug | null
): string {
  if (!slug) return "All campuses";
  return (
    VOLUNTEER_MATRIX_CAMPUS_TABS.find((campus) => campus.slug === slug)?.label ??
    "Selected campus"
  );
}

export type VolunteerMatrixPercentStatus = {
  status: "green" | "yellow" | "red";
  label: string;
};

/** Volunteer matrix fill bands: <80% red, 80–100% yellow, >100% green. */
export function getVolunteerMatrixPercentStatus(
  percent: number
): VolunteerMatrixPercentStatus {
  if (percent > 100) {
    return { status: "green", label: "Above 100%" };
  }
  if (percent >= 80) {
    return { status: "yellow", label: "80–100%" };
  }
  return { status: "red", label: "Below 80%" };
}

export function rowPoolFilledPct(row: {
  rotationPool: number;
  current: number;
  poolFilledPct: number | null;
}): number | null {
  if (row.poolFilledPct != null) return row.poolFilledPct;
  if (row.rotationPool > 0) return (row.current / row.rotationPool) * 100;
  return null;
}

export function volunteerMatrixFilterLabel(
  campusSlug: VolunteerCampusSlug | null,
  ministryAreaSlug: VolunteerMatrixMinistryAreaSlug | null
): string {
  return `${volunteerMatrixCampusLabel(campusSlug)} · ${volunteerMatrixMinistryAreaLabel(ministryAreaSlug)}`;
}

export type VolunteerMatrixAreaSummary = {
  slug: VolunteerMatrixMinistryAreaSlug;
  label: string;
  rotationPool: number;
  current: number;
  gap: number;
  poolFilledPct: number | null;
  status: VolunteerMatrixPercentStatus;
};

export function buildVolunteerMatrixAreaSummaries(
  campuses: VolunteerMatrixCampusData[]
): VolunteerMatrixAreaSummary[] {
  const rowsByArea = new Map<
    VolunteerMatrixMinistryAreaSlug,
    VolunteerMatrixCampusData["rows"]
  >();

  for (const campus of campuses) {
    for (const row of campus.rows) {
      const slug = ministryAreaSlugFromSheetName(row.area);
      if (!slug) continue;
      const rows = rowsByArea.get(slug) ?? [];
      rows.push(row);
      rowsByArea.set(slug, rows);
    }
  }

  return VOLUNTEER_MATRIX_MINISTRY_AREAS.map((area) => {
    const rows = rowsByArea.get(area.slug) ?? [];
    const rotationPool = rows.reduce((sum, row) => sum + row.rotationPool, 0);
    const current = rows.reduce((sum, row) => sum + row.current, 0);
    const gap = Math.max(rotationPool - current, 0);
    const poolFilledPct =
      rotationPool > 0 ? (current / rotationPool) * 100 : null;

    return {
      slug: area.slug,
      label: area.label,
      rotationPool,
      current,
      gap,
      poolFilledPct,
      status:
        poolFilledPct != null
          ? getVolunteerMatrixPercentStatus(poolFilledPct)
          : ({ status: "red", label: "No data" } as VolunteerMatrixPercentStatus),
    };
  }).sort((a, b) => {
    if (b.gap !== a.gap) return b.gap - a.gap;
    return (a.poolFilledPct ?? 0) - (b.poolFilledPct ?? 0);
  });
}

export async function getVolunteerMatrixView(
  campusSlug: VolunteerCampusSlug | null,
  ministryAreaSlug: VolunteerMatrixMinistryAreaSlug | null = null
): Promise<VolunteerMatrixView> {
  const { campuses: sheetCampuses, warnings, source } =
    await fetchVolunteerMatrixCampuses();

  const byMinistry = filterVolunteerMatrixByMinistryArea(
    sheetCampuses,
    ministryAreaSlug
  );
  const filtered = filterVolunteerMatrixByCampusSlug(byMinistry, campusSlug);
  const breakdownCampuses = filterVolunteerMatrixByCampusSlug(
    sheetCampuses,
    campusSlug
  );
  const forAreaSummary = breakdownCampuses;
  const totals = aggregateVolunteerMatrixTotals(filtered);
  const areaSummaries = buildVolunteerMatrixAreaSummaries(forAreaSummary);

  return {
    campuses: filtered,
    breakdownCampuses,
    totals,
    areaSummaries,
    campusSlug,
    campusLabel: volunteerMatrixCampusLabel(campusSlug),
    ministryAreaSlug,
    ministryAreaLabel: volunteerMatrixMinistryAreaLabel(ministryAreaSlug),
    filterLabel: volunteerMatrixFilterLabel(campusSlug, ministryAreaSlug),
    source,
    warnings,
    fetchedAt: new Date().toISOString(),
  };
}
