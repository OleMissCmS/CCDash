export const VOLUNTEER_MATRIX_MINISTRY_AREAS = [
  {
    slug: "weekend-experience",
    label: "Weekend Experience",
    sheetNames: ["Weekend Experience"],
  },
  {
    slug: "next-gen",
    label: "Next Gen",
    sheetNames: ["Next Gen"],
  },
  {
    slug: "operations",
    label: "Operations",
    sheetNames: ["Operations"],
  },
  {
    slug: "adult-discipleship",
    label: "Adult Discipleship",
    sheetNames: ["Adult Discipleship"],
  },
] as const;

export type VolunteerMatrixMinistryAreaSlug =
  (typeof VOLUNTEER_MATRIX_MINISTRY_AREAS)[number]["slug"];

const SHEET_NAME_TO_AREA_SLUG = new Map<string, VolunteerMatrixMinistryAreaSlug>(
  VOLUNTEER_MATRIX_MINISTRY_AREAS.flatMap((area) =>
    area.sheetNames.map((name) => [normalizeAreaName(name), area.slug] as const)
  )
);

function normalizeAreaName(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveVolunteerMatrixMinistryAreaSlug(
  raw: string | null | undefined
): VolunteerMatrixMinistryAreaSlug | null {
  if (!raw || raw === "all") return null;
  const match = VOLUNTEER_MATRIX_MINISTRY_AREAS.find((area) => area.slug === raw);
  return match?.slug ?? null;
}

export function ministryAreaSlugFromSheetName(
  areaName: string
): VolunteerMatrixMinistryAreaSlug | null {
  return SHEET_NAME_TO_AREA_SLUG.get(normalizeAreaName(areaName)) ?? null;
}

export function volunteerMatrixMinistryAreaLabel(
  slug: VolunteerMatrixMinistryAreaSlug | null
): string {
  if (!slug) return "All ministry areas";
  return (
    VOLUNTEER_MATRIX_MINISTRY_AREAS.find((area) => area.slug === slug)?.label ??
    "Selected ministry area"
  );
}
