const DEFAULT_SHEET_ID = "1vpr_ahKFjQIiWCMQ04mkH7UZMhfEXcwdj7hWlVT7QCo";

/** Column D — Total In-Person Adults (church-wide adult worship). */
const IN_PERSON_ADULTS_COL = 3;
/** Column E — Total kids attendance (church-wide). */
const KIDS_CHURCHWIDE_COL = 4;

/** 2023 tab — church-wide kids (column AC). */
const KIDS_CHURCHWIDE_COL_2023 = 28;

type KidsSheetLayout = {
  name: string;
  churchTotalCol: number;
  online: readonly [number, number, number];
  churchKidsCol: number;
};

const KIDS_SHEET_LAYOUTS: KidsSheetLayout[] = [
  {
    name: "2024+",
    churchTotalCol: 2,
    online: [6, 7, 8],
    churchKidsCol: KIDS_CHURCHWIDE_COL,
  },
  {
    name: "2023",
    churchTotalCol: 2,
    online: [4, 5, 6],
    churchKidsCol: KIDS_CHURCHWIDE_COL_2023,
  },
];

const CAMPUS_SLUGS = ["mount-pleasant", "alma", "st-johns"] as const;
export type AttendanceCampusSlug = (typeof CAMPUS_SLUGS)[number];

type CampusSheetLayout = {
  slug: AttendanceCampusSlug;
  serviceCols: readonly number[];
  kidsCol?: number;
  totalCol: number;
};

type SheetLayout = {
  name: string;
  online: readonly [number, number, number];
  campuses: ReadonlyArray<CampusSheetLayout>;
};

const SHEET_LAYOUTS: SheetLayout[] = [
  {
    name: "2025",
    online: [6, 7, 8],
    campuses: [
      {
        slug: "mount-pleasant",
        serviceCols: [10, 11, 12, 13],
        kidsCol: 14,
        totalCol: 15,
      },
      {
        slug: "alma",
        serviceCols: [17, 18, 19],
        kidsCol: 20,
        totalCol: 21,
      },
      {
        slug: "st-johns",
        serviceCols: [23, 24],
        kidsCol: 25,
        totalCol: 26,
      },
    ],
  },
  {
    name: "2026",
    online: [6, 7, 8],
    campuses: [
      {
        slug: "mount-pleasant",
        serviceCols: [10, 11, 12, 13],
        totalCol: 14,
      },
      { slug: "alma", serviceCols: [16, 17, 18], totalCol: 19 },
      { slug: "st-johns", serviceCols: [21, 22, 23], totalCol: 24 },
    ],
  },
];

export type ParsedSundayAttendance = {
  date: string;
  churchTotal: number;
  /** Column D — total in-person adults (church-wide adult worship). */
  inPersonAdultsTotal: number;
  /** Column E — total kids attendance (church-wide). */
  churchKidsTotal: number | null;
  onlineTotal: number;
  inPersonTotal: number;
  campuses: Record<AttendanceCampusSlug, { total: number; kids: number | null }>;
  layout: string;
  note?: string;
};

export type ParsedSundayTotalAttendance = {
  date: string;
  inPersonTotal: number;
  campuses: Record<AttendanceCampusSlug, number>;
};

export type MonthlyAttendanceAggregate = {
  periodStart: string;
  churchTotal: number | null;
  inPersonAdultsTotal: number | null;
  churchKidsTotal: number | null;
  inPersonTotal: number | null;
  campuses: Record<
    AttendanceCampusSlug,
    {
      total: number | null;
      kids: number | null;
      kidsPct: number | null;
    }
  >;
  sundayCount: number;
};

export type FiscalYearAttendanceAggregate = MonthlyAttendanceAggregate & {
  fiscalYear: string;
};

function getSheetId(): string {
  return process.env.GOOGLE_SHEETS_ATTENDANCE_ID ?? DEFAULT_SHEET_ID;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

function parseSheetDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.includes("/")) return null;

  const parts = trimmed.split("/");
  if (parts.length < 2) return null;

  const month = Number(parts[0]);
  const day = Number(parts[1]);
  let year = parts[2] ? Number(parts[2]) : NaN;

  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (!Number.isFinite(year)) return null;
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

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function fiscalYearForDate(date: string): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  if (month >= 5) {
    return `FY${String(year).slice(2)}/${String(year + 1).slice(2)}`;
  }
  return `FY${String(year - 1).slice(2)}/${String(year).slice(2)}`;
}

function parseCampusBlock(
  row: string[],
  campus: CampusSheetLayout
): { total: number; kids: number | null } | null {
  const services = campus.serviceCols
    .map((index) => parseNumber(row[index]))
    .filter((value): value is number => value !== null);

  const total = parseNumber(row[campus.totalCol]);
  if (!services.length || total === null) return null;

  const serviceSum = services.reduce((sum, value) => sum + value, 0);
  let kids: number | null = null;

  if (campus.kidsCol !== undefined) {
    kids = parseNumber(row[campus.kidsCol]);
    if (kids !== null) {
      if (Math.abs(serviceSum + kids - total) > 2) return null;
    } else if (Math.abs(serviceSum - total) > 2) {
      return null;
    }
  } else if (Math.abs(serviceSum - total) > 2) {
    return null;
  }

  return { total, kids };
}

export function parseSundayAttendanceRow(
  row: string[]
): ParsedSundayAttendance | null {
  if (row.length < 3) return null;

  const churchTotal = parseNumber(row[2]);
  const inPersonAdultsTotal = parseNumber(row[IN_PERSON_ADULTS_COL]);
  const churchKidsTotal = parseNumber(row[KIDS_CHURCHWIDE_COL]);
  if (churchTotal === null || inPersonAdultsTotal === null) return null;

  const note = row[0]?.trim() || undefined;
  const date = parseSheetDate(row[1] ?? "");
  if (!date) return null;

  for (const layout of SHEET_LAYOUTS) {
    const live = parseNumber(row[layout.online[0]]);
    const demand = parseNumber(row[layout.online[1]]);
    const onlineTotal = parseNumber(row[layout.online[2]]);

    if (
      live === null ||
      demand === null ||
      onlineTotal === null ||
      Math.abs(live + demand - onlineTotal) > 1
    ) {
      continue;
    }

    const campuses = {} as ParsedSundayAttendance["campuses"];
    for (const campus of layout.campuses) {
      const parsed = parseCampusBlock(row, campus);
      if (parsed) campuses[campus.slug] = parsed;
    }

    if (Object.keys(campuses).length < 2) continue;

    const inPersonTotal = churchTotal - onlineTotal;
    const campusSum = Object.values(campuses).reduce(
      (sum, campus) => sum + campus.total,
      0
    );

    if (Math.abs(campusSum - inPersonTotal) > 25) continue;

    return {
      date,
      churchTotal,
      inPersonAdultsTotal,
      churchKidsTotal,
      onlineTotal,
      inPersonTotal,
      campuses,
      layout: layout.name,
      note,
    };
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

export async function fetchAttendanceSheet(year: number): Promise<string[][]> {
  const sheetId = getSheetId();
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${year}`;
  const response = await fetch(url, { next: { revalidate: 0 } });

  if (!response.ok) {
    throw new Error(`Failed to fetch attendance sheet for ${year}`);
  }

  const csv = await response.text();
  return parseCsvRows(csv);
}

export function parseAttendanceSheetRows(rows: string[][]): ParsedSundayAttendance[] {
  return rows
    .map((row) => parseSundayAttendanceRow(row))
    .filter((row): row is ParsedSundayAttendance => row !== null);
}

export type ParsedSundayKidsAttendance = {
  date: string;
  churchKidsTotal: number;
  layout: string;
};

export function parseSundayKidsAttendanceRow(
  row: string[]
): ParsedSundayKidsAttendance | null {
  const date = parseSheetDate(row[1] ?? "");
  if (!date) return null;

  for (const layout of KIDS_SHEET_LAYOUTS) {
    const churchTotal = parseNumber(row[layout.churchTotalCol]);
    const live = parseNumber(row[layout.online[0]]);
    const demand = parseNumber(row[layout.online[1]]);
    const onlineTotal = parseNumber(row[layout.online[2]]);
    const churchKidsTotal = parseNumber(row[layout.churchKidsCol]);

    if (
      churchTotal === null ||
      live === null ||
      demand === null ||
      onlineTotal === null ||
      churchKidsTotal === null ||
      churchKidsTotal <= 0 ||
      Math.abs(live + demand - onlineTotal) > 1
    ) {
      continue;
    }

    return { date, churchKidsTotal, layout: layout.name };
  }

  return null;
}

export function parseKidsAttendanceSheetRows(
  rows: string[][]
): ParsedSundayKidsAttendance[] {
  return rows
    .map((row) => parseSundayKidsAttendanceRow(row))
    .filter((row): row is ParsedSundayKidsAttendance => row !== null);
}

export async function fetchParsedKidsAttendanceYears(
  years: number[]
): Promise<ParsedSundayKidsAttendance[]> {
  const results = await Promise.all(
    years.map(async (year) => {
      const rows = await fetchAttendanceSheet(year);
      return parseKidsAttendanceSheetRows(rows);
    })
  );

  const deduped = new Map<string, ParsedSundayKidsAttendance>();
  for (const sunday of results.flat()) {
    deduped.set(sunday.date, sunday);
  }

  return [...deduped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchParsedAttendanceYears(
  years: number[]
): Promise<ParsedSundayAttendance[]> {
  const results = await Promise.all(
    years.map(async (year) => {
      const rows = await fetchAttendanceSheet(year);
      return parseAttendanceSheetRows(rows);
    })
  );

  const deduped = new Map<string, ParsedSundayAttendance>();
  for (const sunday of results.flat()) {
    deduped.set(sunday.date, sunday);
  }

  return [...deduped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const TOTAL_ATTENDANCE_LAYOUTS: Record<
  number,
  {
    online: readonly [number, number, number];
    campusTotals: Record<AttendanceCampusSlug, number>;
  }
> = {
  2023: {
    online: [4, 5, 6],
    campusTotals: {
      "mount-pleasant": 13,
      alma: 18,
      "st-johns": 23,
    },
  },
  2024: {
    online: [6, 7, 8],
    campusTotals: {
      "mount-pleasant": 15,
      alma: 21,
      "st-johns": 26,
    },
  },
  2025: {
    online: [6, 7, 8],
    campusTotals: {
      "mount-pleasant": 15,
      alma: 21,
      "st-johns": 26,
    },
  },
  2026: {
    online: [6, 7, 8],
    campusTotals: {
      "mount-pleasant": 15,
      alma: 21,
      "st-johns": 26,
    },
  },
};

function parseSundayTotalAttendanceRow(
  row: string[],
  year: number
): ParsedSundayTotalAttendance | null {
  const layout = TOTAL_ATTENDANCE_LAYOUTS[year];
  if (!layout) return null;

  const date = parseSheetDate(row[1] ?? "");
  const churchTotal = parseNumber(row[2]);
  const live = parseNumber(row[layout.online[0]]);
  const demand = parseNumber(row[layout.online[1]]);
  const onlineTotal = parseNumber(row[layout.online[2]]);
  if (
    !date ||
    churchTotal === null ||
    live === null ||
    demand === null ||
    onlineTotal === null ||
    Math.abs(live + demand - onlineTotal) > 1
  ) {
    return null;
  }

  const campuses = {} as ParsedSundayTotalAttendance["campuses"];
  for (const slug of CAMPUS_SLUGS) {
    const total = parseNumber(row[layout.campusTotals[slug]]);
    if (total === null) return null;
    campuses[slug] = total;
  }

  const inPersonTotal = churchTotal - onlineTotal;
  const campusSum = Object.values(campuses).reduce(
    (sum, total) => sum + total,
    0
  );
  if (Math.abs(campusSum - inPersonTotal) > 25) return null;

  return { date, inPersonTotal, campuses };
}

export async function fetchParsedTotalAttendanceYears(
  years: number[]
): Promise<ParsedSundayTotalAttendance[]> {
  const results = await Promise.all(
    years.map(async (year) => {
      const rows = await fetchAttendanceSheet(year);
      return rows
        .map((row) => parseSundayTotalAttendanceRow(row, year))
        .filter(
          (row): row is ParsedSundayTotalAttendance => row !== null
        );
    })
  );

  const deduped = new Map<string, ParsedSundayTotalAttendance>();
  for (const sunday of results.flat()) {
    deduped.set(sunday.date, sunday);
  }

  return [...deduped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildMonthlyAggregates(
  sundays: ParsedSundayAttendance[]
): MonthlyAttendanceAggregate[] {
  const grouped = new Map<string, ParsedSundayAttendance[]>();

  for (const sunday of sundays) {
    const key = monthStart(sunday.date);
    const list = grouped.get(key) ?? [];
    list.push(sunday);
    grouped.set(key, list);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodStart, rows]) => {
      const campuses = {} as MonthlyAttendanceAggregate["campuses"];

      for (const slug of CAMPUS_SLUGS) {
        const totals = rows
          .map((row) => row.campuses[slug]?.total ?? null)
          .filter((value): value is number => value !== null);
        const kids = rows
          .map((row) => row.campuses[slug]?.kids ?? null)
          .filter((value): value is number => value !== null);
        const totalAvg = average(totals);
        const kidsAvg = average(kids);

        campuses[slug] = {
          total: totalAvg,
          kids: kidsAvg,
          kidsPct:
            totalAvg && kidsAvg !== null
              ? Number(((kidsAvg / totalAvg) * 100).toFixed(1))
              : null,
        };
      }

      return {
        periodStart,
        churchTotal: average(rows.map((row) => row.churchTotal)),
        inPersonAdultsTotal: average(
          rows.map((row) => row.inPersonAdultsTotal)
        ),
        churchKidsTotal: average(
          rows
            .map((row) => row.churchKidsTotal)
            .filter((value): value is number => value !== null)
        ),
        inPersonTotal: average(rows.map((row) => row.inPersonTotal)),
        campuses,
        sundayCount: rows.length,
      };
    });
}

export function buildFiscalYearAggregates(
  sundays: ParsedSundayAttendance[]
): FiscalYearAttendanceAggregate[] {
  const grouped = new Map<string, ParsedSundayAttendance[]>();

  for (const sunday of sundays) {
    const fiscalYear = fiscalYearForDate(sunday.date);
    const list = grouped.get(fiscalYear) ?? [];
    list.push(sunday);
    grouped.set(fiscalYear, list);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fiscalYear, rows]) => {
      const campuses = {} as MonthlyAttendanceAggregate["campuses"];
      for (const slug of CAMPUS_SLUGS) {
        const totals = rows
          .map((row) => row.campuses[slug]?.total ?? null)
          .filter((value): value is number => value !== null);
        const kids = rows
          .map((row) => row.campuses[slug]?.kids ?? null)
          .filter((value): value is number => value !== null);
        const totalAvg = average(totals);
        const kidsAvg = average(kids);

        campuses[slug] = {
          total: totalAvg,
          kids: kidsAvg,
          kidsPct:
            totalAvg && kidsAvg !== null
              ? Number(((kidsAvg / totalAvg) * 100).toFixed(1))
              : null,
        };
      }

      return {
        fiscalYear,
        periodStart: `${fiscalYear}`,
        churchTotal: average(rows.map((row) => row.churchTotal)),
        inPersonAdultsTotal: average(
          rows.map((row) => row.inPersonAdultsTotal)
        ),
        churchKidsTotal: average(
          rows
            .map((row) => row.churchKidsTotal)
            .filter((value): value is number => value !== null)
        ),
        inPersonTotal: average(rows.map((row) => row.inPersonTotal)),
        campuses,
        sundayCount: rows.length,
      };
    });
}

export function buildAttendanceAggregates(sundays: ParsedSundayAttendance[]) {
  return {
    sundays,
    monthly: buildMonthlyAggregates(sundays),
    fiscalYears: buildFiscalYearAggregates(sundays),
  };
}
