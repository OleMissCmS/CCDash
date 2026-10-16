import { getFiscalYearMonthlyBounds } from "./periods";
import { TARGET_FISCAL_YEAR } from "./types";
import {
  discoverGoogleSheetTabs,
  fetchGoogleSheetCsv,
} from "./google-sheets-fetch";

const DEFAULT_SHEET_ID = "1t5h7w7ro9BYIOzpYXm0sV99U-ce1HRMIzhY4iOjAn3s";

export type ConnectCampusSlug = "mount-pleasant" | "alma" | "st-johns";

export type ConnectEventTabKind = "signup" | "completed";

export type BaptismEntry = {
  name: string;
  campusSlug: ConnectCampusSlug;
  campusLabel: string;
  tabName: string;
  tabKind: ConnectEventTabKind;
  eventDate: string | null;
};

export type ConnectEventsBaptismSummary = {
  fiscalYearTotal: number;
  fiscalYearLabel: string;
  sinceLabel: string;
  byCampus: Record<ConnectCampusSlug, number>;
  source: "google_sheets" | "sample";
  warnings: string[];
};

const CAMPUS_DEFINITIONS: Array<{
  slug: ConnectCampusSlug;
  label: string;
  patterns: RegExp[];
}> = [
  {
    slug: "alma",
    label: "Alma",
    patterns: [/^alma$/i],
  },
  {
    slug: "mount-pleasant",
    label: "Mt. Pleasant",
    patterns: [/^(mp|m\.?\s*p\.?|mount\s+pleasant|mt\.?\s*pleasant)$/i],
  },
  {
    slug: "st-johns",
    label: "St. Johns",
    patterns: [/^(sj|s\.?\s*j\.?|st\.?\s*johns?)$/i],
  },
];

const SKIP_CELL_PATTERNS = [
  /^total/i,
  /^count/i,
  /^notes?/i,
  /^campus/i,
  /^name/i,
  /^#/,
  /^\d+$/,
];

const DEFAULT_TAB_NAMES = [
  "Baptism",
  "Kids Baptism",
  "Bap. Winter 26",
];

const CAMPUS_ROTATION: ConnectCampusSlug[] = [
  "alma",
  "mount-pleasant",
  "st-johns",
];

function isAuthError(message: string): boolean {
  return message.includes("not publicly readable");
}

function getSheetId(): string {
  return process.env.GOOGLE_SHEETS_CONNECT_EVENTS_ID ?? DEFAULT_SHEET_ID;
}

async function getTabNames(): Promise<string[]> {
  const configured = process.env.GOOGLE_SHEETS_CONNECT_EVENTS_TABS?.trim();
  if (configured) {
    return configured
      .split(",")
      .map((tab) => tab.trim())
      .filter(Boolean);
  }

  const discovered = await discoverGoogleSheetTabs(getSheetId());
  if (discovered.length > 0) {
    return discovered;
  }

  return DEFAULT_TAB_NAMES;
}

export function classifyConnectEventTab(tabName: string): ConnectEventTabKind | null {
  const normalized = tabName.trim().toLowerCase();

  if (normalized === "baptism" || normalized === "kids baptism") {
    return "signup";
  }

  if (
    /^bap\./i.test(tabName) ||
    /baptism\s*\/\s*cd/i.test(tabName) ||
    /\b(spring|summer|fall|autumn|winter)\b/i.test(tabName)
  ) {
    return "completed";
  }

  return null;
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

    if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(cell);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      if (char === "\r") i += 1;
      continue;
    }

    if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim().length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeCell(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function matchCampus(cell: string): (typeof CAMPUS_DEFINITIONS)[number] | null {
  const normalized = normalizeCell(cell);
  if (!normalized) return null;
  return (
    CAMPUS_DEFINITIONS.find((campus) =>
      campus.patterns.some((pattern) => pattern.test(normalized))
    ) ?? null
  );
}

function campusFromSectionTitle(cell: string): (typeof CAMPUS_DEFINITIONS)[number] | null {
  const upper = normalizeCell(cell).toUpperCase();
  if (!upper) return null;
  if (upper.includes("ALMA")) {
    return CAMPUS_DEFINITIONS.find((campus) => campus.slug === "alma") ?? null;
  }
  if (upper.includes("PLEASANT") || /\bMP\b/.test(upper)) {
    return (
      CAMPUS_DEFINITIONS.find((campus) => campus.slug === "mount-pleasant") ??
      null
    );
  }
  if (upper.includes("ST JOHN") || upper.includes("ST. JOHN") || /\bSJ\b/.test(upper)) {
    return CAMPUS_DEFINITIONS.find((campus) => campus.slug === "st-johns") ?? null;
  }
  return null;
}

function campusBySlug(slug: ConnectCampusSlug): (typeof CAMPUS_DEFINITIONS)[number] {
  return CAMPUS_DEFINITIONS.find((campus) => campus.slug === slug)!;
}

function isSectionTitle(cell: string): boolean {
  const upper = normalizeCell(cell).toUpperCase();
  return /BAPTISM|CHILD BAPTISM|NEXT STEPS/.test(upper);
}

function isCampusBlockHeader(row: string[], isKidsTab: boolean): boolean {
  const first = normalizeCell(row[0]);
  const second = normalizeCell(row[1]);
  if (first) return false;
  if (isKidsTab) {
    return /guardian|child'?s name|^name$/i.test(second);
  }
  return second.toLowerCase() === "name";
}

function parseSheetDate(raw: string): string | null {
  const trimmed = normalizeCell(raw);
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (!trimmed.includes("/")) return null;
  const parts = trimmed.split("/");
  if (parts.length < 2) return null;

  const month = Number(parts[0]);
  const day = Number(parts[1]);
  let year = parts[2] ? Number(parts[2]) : NaN;
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (!Number.isFinite(year)) year = new Date().getFullYear();
  if (year < 100) year += 2000;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isSkippableCell(cell: string): boolean {
  const normalized = normalizeCell(cell);
  if (!normalized) return true;
  if (matchCampus(normalized)) return true;
  return SKIP_CELL_PATTERNS.some((pattern) => pattern.test(normalized));
}

function looksLikeName(cell: string): boolean {
  const normalized = normalizeCell(cell);
  if (!normalized || normalized.length < 2) return false;
  if (isSkippableCell(normalized)) return false;
  if (!/[a-zA-Z]/.test(normalized)) return false;
  if (/^yes$/i.test(normalized) || /^no$/i.test(normalized)) return false;
  if (/@/.test(normalized) || /^\d{3}[-.]/.test(normalized)) return false;
  return true;
}

function parseTwoDigitYear(value: string): number | null {
  const match = value.match(/\b(\d{2})\b/);
  if (!match) return null;
  const year = Number(match[1]);
  if (!Number.isFinite(year)) return null;
  return 2000 + year;
}

function parseFourDigitYear(value: string): number | null {
  const match = value.match(/\b(20\d{2})\b/);
  if (!match) return null;
  return Number(match[1]);
}

export function parseEventDateFromTab(tabName: string): string | null {
  const year =
    parseFourDigitYear(tabName) ?? parseTwoDigitYear(tabName) ?? new Date().getFullYear();
  const seasonMatch = tabName.match(/\b(spring|summer|fall|autumn|winter)\b/i);
  const season = seasonMatch?.[1]?.toLowerCase() ?? null;

  let month = 4;
  if (season === "winter") month = 1;
  if (season === "summer") month = 7;
  if (season === "fall" || season === "autumn") month = 10;
  if (season === "spring") month = 4;

  if (!season) {
    if (/winter/i.test(tabName)) month = 1;
    if (/spring/i.test(tabName)) month = 4;
  }

  return `${year}-${String(month).padStart(2, "0")}-15`;
}

function fiscalYearStartDate(): string {
  return getFiscalYearMonthlyBounds(TARGET_FISCAL_YEAR).start;
}

function formatSinceLabel(startDate: string): string {
  const date = new Date(`${startDate}T12:00:00`);
  return `Since ${date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}

function isOnOrAfter(dateIso: string | null, startDate: string): boolean {
  if (!dateIso) return false;
  return dateIso >= startDate;
}

function addEntry(
  entries: BaptismEntry[],
  name: string,
  campus: (typeof CAMPUS_DEFINITIONS)[number],
  tabName: string,
  tabKind: ConnectEventTabKind,
  eventDate: string | null
) {
  const normalizedName = normalizeCell(name);
  if (!looksLikeName(normalizedName)) return;

  entries.push({
    name: normalizedName,
    campusSlug: campus.slug,
    campusLabel: campus.label,
    tabName,
    tabKind,
    eventDate,
  });
}

export function parseConnectEventTabRows(
  rows: string[][],
  tabName: string,
  tabKind: ConnectEventTabKind
): BaptismEntry[] {
  const entries: BaptismEntry[] = [];
  const isKidsTab = /kids/i.test(tabName);
  const fallbackEventDate =
    tabKind === "completed" ? parseEventDateFromTab(tabName) : null;

  let blockIndex = -1;
  let currentCampus: (typeof CAMPUS_DEFINITIONS)[number] | null = null;

  for (const row of rows) {
    const firstCell = normalizeCell(row[0]);
    const secondCell = normalizeCell(row[1]);
    const thirdCell = normalizeCell(row[2]);

    if (firstCell && isSectionTitle(firstCell)) {
      currentCampus = campusFromSectionTitle(firstCell);
      blockIndex = currentCampus
        ? CAMPUS_ROTATION.indexOf(currentCampus.slug)
        : 0;
      if (!currentCampus && blockIndex >= 0) {
        currentCampus = campusBySlug(CAMPUS_ROTATION[blockIndex]);
      }
      continue;
    }

    if (isCampusBlockHeader(row, isKidsTab)) {
      blockIndex += 1;
      if (blockIndex < CAMPUS_ROTATION.length) {
        currentCampus = campusBySlug(CAMPUS_ROTATION[blockIndex]);
      }
      continue;
    }

    if (!currentCampus) continue;

    const name = isKidsTab
      ? thirdCell || secondCell
      : secondCell;
    if (!looksLikeName(name)) continue;

    const rowDate = parseSheetDate(firstCell);
    const eventDate =
      tabKind === "completed"
        ? rowDate ?? fallbackEventDate
        : rowDate;

    addEntry(
      entries,
      name,
      currentCampus,
      tabName,
      tabKind,
      eventDate
    );
  }

  return entries;
}

function summarizeEntries(
  completed: BaptismEntry[],
  upcoming: BaptismEntry[],
  warnings: string[],
  source: "google_sheets" | "sample"
): ConnectEventsBaptismSummary {
  const fyStart = fiscalYearStartDate();
  const signups = upcoming.filter((entry) =>
    isOnOrAfter(entry.eventDate, fyStart)
  );

  const byCampus: Record<ConnectCampusSlug, number> = {
    alma: 0,
    "mount-pleasant": 0,
    "st-johns": 0,
  };

  for (const entry of signups) {
    byCampus[entry.campusSlug] += 1;
  }

  return {
    fiscalYearTotal: signups.length,
    fiscalYearLabel: TARGET_FISCAL_YEAR,
    sinceLabel: formatSinceLabel(fyStart),
    byCampus,
    source,
    warnings,
  };
}

function getSampleConnectEventsData(): ConnectEventsBaptismSummary {
  const upcoming: BaptismEntry[] = [
    {
      name: "Casey Nguyen",
      campusSlug: "mount-pleasant",
      campusLabel: "Mt. Pleasant",
      tabName: "Baptism",
      tabKind: "signup",
      eventDate: "2026-06-08",
    },
    {
      name: "Riley Chen",
      campusSlug: "alma",
      campusLabel: "Alma",
      tabName: "Kids Baptism",
      tabKind: "signup",
      eventDate: "2026-06-02",
    },
  ];

  return summarizeEntries([], upcoming, [
    "Showing sample baptism data until the connect events Google Sheet is shared publicly.",
  ], "sample");
}

export function filterConnectEventsByCampus(
  data: ConnectEventsBaptismSummary,
  campusSlug: ConnectCampusSlug | null
): ConnectEventsBaptismSummary {
  if (!campusSlug) return data;

  return {
    ...data,
    fiscalYearTotal: data.byCampus[campusSlug],
    byCampus: {
      alma: campusSlug === "alma" ? data.byCampus.alma : 0,
      "mount-pleasant":
        campusSlug === "mount-pleasant" ? data.byCampus["mount-pleasant"] : 0,
      "st-johns": campusSlug === "st-johns" ? data.byCampus["st-johns"] : 0,
    },
  };
}

export async function fetchConnectEventsBaptisms(): Promise<ConnectEventsBaptismSummary> {
  const warnings: string[] = [];
  const completed: BaptismEntry[] = [];
  const upcoming: BaptismEntry[] = [];
  let loadedTabs = 0;
  let authFailures = 0;

  const tabNames = await getTabNames();

  for (const tabName of tabNames) {
    const tabKind = classifyConnectEventTab(tabName);
    if (!tabKind) continue;

    try {
      const csv = await fetchGoogleSheetCsv(getSheetId(), tabName);
      loadedTabs += 1;
      const rows = parseCsvRows(csv);
      const entries = parseConnectEventTabRows(rows, tabName, tabKind);
      if (entries.length === 0) {
        warnings.push(`No names parsed from tab "${tabName}".`);
      }
      if (tabKind === "completed") {
        completed.push(...entries);
      } else {
        upcoming.push(...entries);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Failed to load tab "${tabName}"`;
      if (isAuthError(message)) {
        authFailures += 1;
      }
      warnings.push(message);
    }
  }

  if (loadedTabs > 0) {
    return summarizeEntries(completed, upcoming, warnings, "google_sheets");
  }

  if (authFailures > 0) {
    warnings.push(
      "Connect events sheet is not publicly readable yet. Share both spreadsheets: General access → Anyone with the link → Viewer."
    );
  }

  const sample = getSampleConnectEventsData();
  return {
    ...sample,
    warnings: [...warnings, ...sample.warnings],
  };
}
