import {
  ministryAreaSlugFromSheetName,
  type VolunteerMatrixMinistryAreaSlug,
} from "./volunteer-matrix-areas";

const DEFAULT_SHEET_ID = "1u5ApKnGy8zTiVIIe8Cf8MXOcNPAL65NJrvzF4zD_ke4";

export type VolunteerCampusSlug = "mount-pleasant" | "alma" | "st-johns";

export type VolunteerMatrixCampusTab = {
  slug: VolunteerCampusSlug;
  sheetName: string;
  label: string;
};

export const VOLUNTEER_MATRIX_CAMPUS_TABS: VolunteerMatrixCampusTab[] = [
  { slug: "mount-pleasant", sheetName: "Mt Pleasant", label: "Mt. Pleasant" },
  { slug: "alma", sheetName: "Alma", label: "Alma" },
  { slug: "st-johns", sheetName: "St. Johns", label: "St. Johns" },
];

export type VolunteerMatrixRow = {
  area: string;
  team: string;
  ministry: string;
  /** Column D — 1 Per Service Need */
  perServiceNeed: number;
  /** Column E — 2 Rotation Pool Needed (total volunteers required) */
  rotationPool: number;
  current: number;
  poolFilledPct: number | null;
};

export type VolunteerMatrixCampusTotals = {
  perServiceNeed: number;
  rotationPool: number;
  current: number;
  poolFilledPct: number | null;
  needCoveragePct: number | null;
  gap: number;
};

export type VolunteerMatrixCampusData = {
  slug: VolunteerCampusSlug;
  label: string;
  sheetName: string;
  rows: VolunteerMatrixRow[];
  totals: VolunteerMatrixCampusTotals;
};

export type VolunteerMatrixSheetResult = {
  campus: VolunteerMatrixCampusData;
  warnings: string[];
};

function getSheetId(): string {
  return process.env.GOOGLE_SHEETS_VOLUNTEER_MATRIX_ID ?? DEFAULT_SHEET_ID;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim();
}

function parseCount(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed || trimmed === "-" || trimmed === "—") return null;
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

function parsePercent(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/%/g, "");
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (Number.isNaN(num)) return null;
  return num <= 1 && num >= 0 ? num * 100 : num;
}

function findColumn(headers: string[], patterns: string[]): number {
  for (let index = 0; index < headers.length; index += 1) {
    const header = normalizeHeader(headers[index] ?? "");
    if (!header) continue;
    if (patterns.some((pattern) => header.includes(pattern))) {
      return index;
    }
  }
  return -1;
}

function isTotalRow(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "total" ||
    normalized.startsWith("total ") ||
    normalized.includes("grand total")
  );
}

function computeTotals(rows: VolunteerMatrixRow[]): VolunteerMatrixCampusTotals {
  const perServiceNeed = rows.reduce(
    (sum, row) => sum + row.perServiceNeed,
    0
  );
  const rotationPool = rows.reduce((sum, row) => sum + row.rotationPool, 0);
  const current = rows.reduce((sum, row) => sum + row.current, 0);

  const poolFilledPct =
    rotationPool > 0 ? (current / rotationPool) * 100 : null;
  const needCoveragePct =
    rotationPool > 0 ? (current / rotationPool) * 100 : null;

  return {
    perServiceNeed,
    rotationPool,
    current,
    poolFilledPct,
    needCoveragePct,
    gap: Math.max(rotationPool - current, 0),
  };
}

export function parseVolunteerMatrixRows(
  rows: string[][],
  campus: VolunteerMatrixCampusTab
): VolunteerMatrixSheetResult {
  const warnings: string[] = [];
  const headerIndex = rows.findIndex((row) => {
    const joined = row.map((cell) => normalizeHeader(cell)).join(" ");
    const hits = [
      joined.includes("need"),
      joined.includes("current") || joined.includes("filled"),
      joined.includes("pool"),
    ].filter(Boolean).length;
    return hits >= 2;
  });

  if (headerIndex === -1) {
    return {
      campus: {
        slug: campus.slug,
        label: campus.label,
        sheetName: campus.sheetName,
        rows: [],
        totals: {
          perServiceNeed: 0,
          rotationPool: 0,
          current: 0,
          poolFilledPct: null,
          needCoveragePct: null,
          gap: 0,
        },
      },
      warnings: [
        `Could not find a header row on tab "${campus.sheetName}". Expected columns for need, current/filled, and pool.`,
      ],
    };
  }

  const headers = rows[headerIndex];
  const perServiceNeedCol = findColumn(headers, [
    "per service need",
    "1 per service",
    "per service",
  ]);
  const rotationPoolCol = findColumn(headers, [
    "rotation pool",
    "2 rotation",
    "pool needed",
  ]);
  const currentCol = findColumn(headers, [
    "current count",
    "current",
    "filled",
    "active",
    "assigned",
    "have",
  ]);
  const filledPctCol = findColumn(headers, [
    "% filled",
    "pool filled",
    "filled %",
    "percent filled",
    "filled percent",
    "% of pool filled",
  ]);

  if (rotationPoolCol === -1 || currentCol === -1) {
    warnings.push(
      `Tab "${campus.sheetName}" is missing one or more required columns (rotation pool, current). Found header: ${headers.filter(Boolean).join(" | ")}`
    );
  }

  const parsedRows: VolunteerMatrixRow[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const area = (row[0] ?? "").trim();
    const team = (row[1] ?? "").trim();
    const ministry = team ? (area ? `${area} · ${team}` : team) : area;
    if (isTotalRow(ministry) || isTotalRow(area)) continue;

    const perServiceNeed =
      perServiceNeedCol >= 0 ? parseCount(row[perServiceNeedCol]) : null;
    const rotationPool =
      rotationPoolCol >= 0 ? parseCount(row[rotationPoolCol]) : null;
    const current = currentCol >= 0 ? parseCount(row[currentCol]) : null;

    if (
      perServiceNeed === null &&
      rotationPool === null &&
      current === null
    ) {
      continue;
    }

    parsedRows.push({
      area,
      team,
      ministry,
      perServiceNeed: perServiceNeed ?? 0,
      rotationPool: rotationPool ?? 0,
      current: current ?? 0,
      poolFilledPct:
        filledPctCol >= 0
          ? parsePercent(row[filledPctCol])
          : rotationPool && rotationPool > 0 && current != null
            ? (current / rotationPool) * 100
            : null,
    });
  }

  if (parsedRows.length === 0) {
    warnings.push(`No ministry rows parsed from tab "${campus.sheetName}".`);
  }

  return {
    campus: {
      slug: campus.slug,
      label: campus.label,
      sheetName: campus.sheetName,
      rows: parsedRows,
      totals: computeTotals(parsedRows),
    },
    warnings,
  };
}

async function fetchSheetCsv(sheetName: string): Promise<string> {
  const sheetId = getSheetId();
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error(`Failed to fetch volunteer matrix tab "${sheetName}"`);
  }
  const text = await response.text();
  if (text.trim().startsWith("<!DOCTYPE") || text.includes("accounts.google.com")) {
    throw new Error(
      `Volunteer matrix sheet tab "${sheetName}" is not publicly readable. Share the sheet as "Anyone with the link can view".`
    );
  }
  return text;
}

export async function fetchVolunteerMatrixCampus(
  campus: VolunteerMatrixCampusTab
): Promise<VolunteerMatrixSheetResult> {
  const csv = await fetchSheetCsv(campus.sheetName);
  return parseVolunteerMatrixRows(parseCsvRows(csv), campus);
}

export async function fetchVolunteerMatrixCampuses(): Promise<{
  campuses: VolunteerMatrixCampusData[];
  warnings: string[];
  source: "google_sheets" | "sample";
}> {
  const warnings: string[] = [];
  const campuses: VolunteerMatrixCampusData[] = [];

  for (const tab of VOLUNTEER_MATRIX_CAMPUS_TABS) {
    try {
      const result = await fetchVolunteerMatrixCampus(tab);
      campuses.push(result.campus);
      warnings.push(...result.warnings);
    } catch (error) {
      warnings.push(
        error instanceof Error ? error.message : `Failed to load ${tab.sheetName}`
      );
    }
  }

  if (campuses.some((campus) => campus.rows.length > 0)) {
    return { campuses, warnings, source: "google_sheets" };
  }

  return {
    campuses: getSampleVolunteerMatrixData(),
    warnings: [
      ...warnings,
      "Showing sample data until the Google Sheet tabs load successfully (Mt Pleasant, Alma, St. Johns).",
    ],
    source: "sample",
  };
}

export function getSampleVolunteerMatrixData(): VolunteerMatrixCampusData[] {
  function sampleRow(
    area: string,
    team: string,
    perServiceNeed: number,
    rotationPool: number,
    current: number,
    poolFilledPct: number
  ): VolunteerMatrixRow {
    return {
      area,
      team,
      ministry: `${area} · ${team}`,
      perServiceNeed,
      rotationPool,
      current,
      poolFilledPct,
    };
  }

  const sampleRows: Record<VolunteerCampusSlug, VolunteerMatrixRow[]> = {
    "mount-pleasant": [
      sampleRow("Weekend Experience", "Guest Services", 5, 30, 18, 60),
      sampleRow("Next Gen", "Kids", 12, 45, 32, 71.1),
      sampleRow("Next Gen", "Students", 6, 18, 11, 61.1),
      sampleRow("Weekend Experience", "Worship", 10, 22, 17, 77.3),
      sampleRow("Weekend Experience", "Production", 8, 16, 10, 62.5),
    ],
    alma: [
      sampleRow("Weekend Experience", "Guest Services", 4, 14, 9, 64.3),
      sampleRow("Next Gen", "Kids", 8, 24, 16, 66.7),
      sampleRow("Next Gen", "Students", 4, 10, 5, 50),
      sampleRow("Weekend Experience", "Worship", 5, 12, 8, 66.7),
    ],
    "st-johns": [
      sampleRow("Weekend Experience", "Guest Services", 3, 12, 7, 58.3),
      sampleRow("Next Gen", "Kids", 6, 20, 14, 70),
      sampleRow("Next Gen", "Students", 3, 8, 4, 50),
      sampleRow("Weekend Experience", "Worship", 4, 10, 6, 60),
    ],
  };

  return VOLUNTEER_MATRIX_CAMPUS_TABS.map((tab) => {
    const rows = sampleRows[tab.slug];
    return {
      slug: tab.slug,
      label: tab.label,
      sheetName: tab.sheetName,
      rows,
      totals: computeTotals(rows),
    };
  });
}

export function aggregateVolunteerMatrixTotals(
  campuses: VolunteerMatrixCampusData[]
): VolunteerMatrixCampusTotals {
  const rows = campuses.flatMap((campus) => campus.rows);
  return computeTotals(rows);
}

export function filterVolunteerMatrixByCampusSlug(
  campuses: VolunteerMatrixCampusData[],
  slug: VolunteerCampusSlug | null
): VolunteerMatrixCampusData[] {
  if (!slug) return campuses;
  return campuses.filter((campus) => campus.slug === slug);
}

export function filterVolunteerMatrixByMinistryArea(
  campuses: VolunteerMatrixCampusData[],
  areaSlug: VolunteerMatrixMinistryAreaSlug | null
): VolunteerMatrixCampusData[] {
  if (!areaSlug) return campuses;

  return campuses
    .map((campus) => {
      const rows = campus.rows.filter(
        (row) => ministryAreaSlugFromSheetName(row.area) === areaSlug
      );
      return {
        ...campus,
        rows,
        totals: computeTotals(rows),
      };
    })
    .filter((campus) => campus.rows.length > 0);
}
