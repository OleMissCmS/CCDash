import { CALENDAR_YEAR } from "./periods";
import { DEFAULT_FISCAL_YEAR, TARGET_FISCAL_YEAR } from "./types";
import { fiscalYearForDate } from "./google-sheets-attendance";
import {
  discoverGoogleSheetTabs,
  fetchGoogleSheetCsv,
} from "./google-sheets-fetch";

const DEFAULT_SHEET_ID = "1qV87jxXBvW6iznj0Ksk4V9HKblMhP9v0RE94oQZW5EQ";

export type GuestCampusSlug = "mount-pleasant" | "alma" | "st-johns";

export type GuestEntry = {
  name: string | null;
  campusSlug: GuestCampusSlug;
  campusLabel: string;
  serviceDate: string;
  tabName: string;
};

export type FirstTimeGuestsSummary = {
  fiscalYearTotal: number;
  calendarYearTotal: number;
  fiscalYearLabel: string;
  currentFiscalYearTotal: number;
  currentFiscalYearLabel: string;
  calendarYear: number;
  byCampus: Record<GuestCampusSlug, number>;
  guests: GuestEntry[];
  source: "google_sheets" | "sample";
  warnings: string[];
};

const CAMPUS_COLUMNS: Array<{
  slug: GuestCampusSlug;
  label: string;
  patterns: RegExp[];
}> = [
  {
    slug: "mount-pleasant",
    label: "Mt. Pleasant",
    patterns: [/first time guests.*mp/i, /^mp$/i],
  },
  {
    slug: "alma",
    label: "Alma",
    patterns: [/^alma$/i],
  },
  {
    slug: "st-johns",
    label: "St. Johns",
    patterns: [/st\.?\s*johns?'?/i, /^sj$/i],
  },
];

const DEFAULT_TAB_NAMES = ["2026"];

function isAuthError(message: string): boolean {
  return message.includes("not publicly readable");
}

function getSheetId(): string {
  return process.env.GOOGLE_SHEETS_FIRST_TIME_GUESTS_ID ?? DEFAULT_SHEET_ID;
}

async function getTabNames(): Promise<string[]> {
  const configured = process.env.GOOGLE_SHEETS_FIRST_TIME_GUESTS_TABS?.trim();
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

function parseNumber(value: string | undefined): number | null {
  const trimmed = normalizeCell(value).replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
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

function matchGuestCampusColumn(header: string): (typeof CAMPUS_COLUMNS)[number] | null {
  const normalized = normalizeCell(header);
  if (!normalized) return null;
  return (
    CAMPUS_COLUMNS.find((campus) =>
      campus.patterns.some((pattern) => pattern.test(normalized))
    ) ?? null
  );
}

function reportingCalendarYear(guests: GuestEntry[]): number {
  const years = guests.map((guest) =>
    new Date(`${guest.serviceDate}T12:00:00`).getUTCFullYear()
  );
  if (years.length === 0) return CALENDAR_YEAR;
  return Math.max(...years);
}

function summarizeGuests(
  guests: GuestEntry[],
  warnings: string[],
  source: "google_sheets" | "sample"
): FirstTimeGuestsSummary {
  const calendarYear = reportingCalendarYear(guests);

  const fiscalYearTotal = guests.filter(
    (guest) => fiscalYearForDate(guest.serviceDate) === DEFAULT_FISCAL_YEAR
  ).length;

  const currentFiscalYearTotal = guests.filter(
    (guest) => fiscalYearForDate(guest.serviceDate) === TARGET_FISCAL_YEAR
  ).length;

  const calendarYearTotal = guests.filter(
    (guest) =>
      new Date(`${guest.serviceDate}T12:00:00`).getUTCFullYear() === calendarYear
  ).length;

  const byCampus: Record<GuestCampusSlug, number> = {
    alma: 0,
    "mount-pleasant": 0,
    "st-johns": 0,
  };

  for (const guest of guests) {
    byCampus[guest.campusSlug] += 1;
  }

  return {
    fiscalYearTotal,
    calendarYearTotal,
    fiscalYearLabel: DEFAULT_FISCAL_YEAR,
    currentFiscalYearTotal,
    currentFiscalYearLabel: TARGET_FISCAL_YEAR,
    calendarYear,
    byCampus,
    guests,
    source,
    warnings,
  };
}

function addGuestCount(
  guests: GuestEntry[],
  tabName: string,
  campus: (typeof CAMPUS_COLUMNS)[number],
  serviceDate: string,
  count: number
) {
  for (let index = 0; index < count; index += 1) {
    guests.push({
      name: null,
      campusSlug: campus.slug,
      campusLabel: campus.label,
      serviceDate,
      tabName,
    });
  }
}

export function parseFirstTimeGuestRows(
  rows: string[][],
  tabName: string
): GuestEntry[] {
  const guests: GuestEntry[] = [];
  if (rows.length === 0) return guests;

  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => /first time guests/i.test(normalizeCell(cell)))
  );
  if (headerRowIndex < 0) return guests;

  const headers = rows[headerRowIndex];
  const campusColumns = headers
    .map((header, index) => ({
      index,
      campus: index <= 4 ? matchGuestCampusColumn(header) : null,
    }))
    .filter(
      (
        entry
      ): entry is {
        index: number;
        campus: (typeof CAMPUS_COLUMNS)[number];
      } => entry.campus != null
    );

  if (campusColumns.length === 0) return guests;

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const serviceDate = parseSheetDate(row[0]);
    if (!serviceDate) continue;

    for (const { index, campus } of campusColumns) {
      const count = parseNumber(row[index]);
      if (count == null || count <= 0) continue;
      addGuestCount(guests, tabName, campus, serviceDate, count);
    }
  }

  return guests;
}

function getSampleFirstTimeGuestsData(): FirstTimeGuestsSummary {
  const guests: GuestEntry[] = [
    {
      name: null,
      campusSlug: "mount-pleasant",
      campusLabel: "Mt. Pleasant",
      serviceDate: "2026-03-09",
      tabName: "2026",
    },
    {
      name: null,
      campusSlug: "alma",
      campusLabel: "Alma",
      serviceDate: "2026-02-16",
      tabName: "2026",
    },
  ];

  return summarizeGuests(guests, [
    "Showing sample first-time guest data until the Google Sheet is shared publicly.",
  ], "sample");
}

export function filterFirstTimeGuestsByCampus(
  data: FirstTimeGuestsSummary,
  campusSlug: GuestCampusSlug | null
): FirstTimeGuestsSummary {
  if (!campusSlug) return data;

  const guests = data.guests.filter((guest) => guest.campusSlug === campusSlug);
  return summarizeGuests(guests, data.warnings, data.source);
}

export async function fetchFirstTimeGuests(): Promise<FirstTimeGuestsSummary> {
  const warnings: string[] = [];
  const guests: GuestEntry[] = [];
  let loadedTabs = 0;
  let authFailures = 0;

  const tabNames = await getTabNames();

  for (const tabName of tabNames) {
    try {
      const csv = await fetchGoogleSheetCsv(getSheetId(), tabName);
      loadedTabs += 1;
      const rows = parseCsvRows(csv);
      const parsed = parseFirstTimeGuestRows(rows, tabName);
      if (parsed.length === 0) {
        warnings.push(`No first-time guest rows parsed from tab "${tabName}".`);
      }
      guests.push(...parsed);
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
    const deduped = dedupeGuestEntries(guests);
    return summarizeGuests(deduped, warnings, "google_sheets");
  }

  if (authFailures > 0) {
    warnings.push(
      "First-time guests sheet is not publicly readable yet. Share the spreadsheet: General access → Anyone with the link → Viewer."
    );
  }

  const sample = getSampleFirstTimeGuestsData();
  return {
    ...sample,
    warnings: [...warnings, ...sample.warnings],
  };
}

function dedupeGuestEntries(guests: GuestEntry[]): GuestEntry[] {
  const byWeekCampus = new Map<string, GuestEntry[]>();

  for (const guest of guests) {
    const key = `${guest.serviceDate}:${guest.campusSlug}`;
    const existing = byWeekCampus.get(key);
    if (!existing) {
      byWeekCampus.set(key, [guest]);
      continue;
    }
    existing.push(guest);
  }

  const deduped: GuestEntry[] = [];
  for (const entries of byWeekCampus.values()) {
    deduped.push(...entries.slice(0, entries.length / countTabs(entries)));
  }

  return deduped;
}

function countTabs(entries: GuestEntry[]): number {
  return new Set(entries.map((entry) => entry.tabName)).size || 1;
}
