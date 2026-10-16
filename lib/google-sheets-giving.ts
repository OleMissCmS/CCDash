const DEFAULT_SHEET_ID = "1ih_ec1AlOZJDD0wnK8wyGfrtjW8tz_vZ";

export type GivingCampusSlug = "mount-pleasant" | "alma" | "st-johns";

export type ParsedGivingMonth = {
  periodStart: string;
  givers: number | null;
  totalGiving: number | null;
  expenses: number | null;
  campuses: Partial<
    Record<GivingCampusSlug, { giving: number; attendance?: number }>
  >;
};

const CAMPUS_ORDER: GivingCampusSlug[] = [
  "mount-pleasant",
  "alma",
  "st-johns",
];

function getSheetId(): string {
  return process.env.GOOGLE_SHEETS_GIVING_ID ?? DEFAULT_SHEET_ID;
}

function parseMoney(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/[$,\s]/g, "");
  if (!trimmed || trimmed === "-" || trimmed === "—") return null;
  const negative = trimmed.startsWith("(") && trimmed.endsWith(")");
  const numeric = negative
    ? `-${trimmed.slice(1, -1)}`
    : trimmed.replace(/^-/, (m) => m);
  if (!/^-?\d+(\.\d+)?$/.test(numeric)) return null;
  return Number(numeric);
}

function parseCount(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

function parseSheetMonth(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^([A-Za-z]{3})-(\d{2,4})$/);
  if (!match) return null;

  const month = match[1];
  let year = Number(match[2]);
  if (year < 100) year += 2000;

  const parsed = new Date(`${month} 1, ${year}`);
  if (Number.isNaN(parsed.getTime())) return null;

  const monthIndex = parsed.getMonth() + 1;
  return `${year}-${String(monthIndex).padStart(2, "0")}-01`;
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

const GENERAL_FUND_EXPENSE_MIN = 25_000;
const GENERAL_FUND_EXPENSE_MAX = 500_000;

function isLegacyAmountsLayout(
  giving: number | null,
  expenses: number | null,
  total: number | null
): boolean {
  if (giving === null || expenses === null || total === null) return false;
  return (
    expenses < 50_000 &&
    giving > expenses &&
    Math.abs(giving + expenses - total) < 2
  );
}

function maxMoneyInRow(row: string[], startIndex: number): number | null {
  let max: number | null = null;

  for (let index = startIndex; index < row.length; index += 1) {
    const amount = parseMoney(row[index]);
    if (amount == null || amount <= 0) continue;
    if (max == null || amount > max) max = amount;
  }

  return max;
}

function parseModernSecondaryExpenses(row: string[]): number | null {
  const expenses = parseMoney(row[12]);
  if (
    expenses == null ||
    expenses < GENERAL_FUND_EXPENSE_MIN ||
    expenses > GENERAL_FUND_EXPENSE_MAX
  ) {
    return null;
  }
  return expenses;
}

function parseAmountsPrimaryBlock(row: string[]): ParsedGivingMonth | null {
  const periodStart = parseSheetMonth(row[0] ?? "");
  if (!periodStart) return null;

  const givers = parseCount(row[1]);
  const col3 = parseMoney(row[3]);
  const col4 = parseMoney(row[4]);
  const col5 = parseMoney(row[5]);
  const col7 = parseMoney(row[7]);

  let totalGiving: number | null = null;
  let expenses: number | null = null;

  if (isLegacyAmountsLayout(col4, col5, col7)) {
    totalGiving = col4;
    expenses = col5;
  } else if (col7 !== null) {
    totalGiving = col7;
    expenses =
      col4 != null && col4 < col7 && col4 >= 25_000 && col4 <= 200_000
        ? col4
        : null;
  } else if (col4 !== null && col5 !== null) {
    totalGiving = col4 + col5 + (parseMoney(row[6]) ?? 0);
    expenses = col3;
  }

  return { periodStart, givers, totalGiving, expenses, campuses: {} };
}

function parseAmountsSecondaryBlock(row: string[]): ParsedGivingMonth | null {
  const periodStart = parseSheetMonth(row[9] ?? "");
  if (!periodStart) return null;

  const givers = parseCount(row[10]);
  const grandTotal = parseMoney(row[16]);
  const totalGiving = grandTotal ?? maxMoneyInRow(row, 12);
  const expenses = parseModernSecondaryExpenses(row);

  if (totalGiving === null && givers === null && expenses === null) {
    return null;
  }

  return { periodStart, givers, totalGiving, expenses, campuses: {} };
}

function parseCampusModernBlock(row: string[]): ParsedGivingMonth | null {
  if (!row[8]?.trim()) return null;
  const periodStart = parseSheetMonth(row[8]);
  if (!periodStart) return null;

  const campuses: ParsedGivingMonth["campuses"] = {};
  const mpGiving = parseMoney(row[12]);
  const almaGiving = parseMoney(row[13]);
  const sjGiving = parseMoney(row[14]);
  const mpAttendance = parseCount(row[9]);
  const almaAttendance = parseCount(row[10]);
  const sjAttendance = parseCount(row[11]);

  if (mpGiving !== null) {
    campuses["mount-pleasant"] = {
      giving: mpGiving,
      attendance: mpAttendance ?? undefined,
    };
  }
  if (almaGiving !== null) {
    campuses["alma"] = {
      giving: almaGiving,
      attendance: almaAttendance ?? undefined,
    };
  }
  if (sjGiving !== null) {
    campuses["st-johns"] = {
      giving: sjGiving,
      attendance: sjAttendance ?? undefined,
    };
  }

  if (Object.keys(campuses).length === 0) return null;

  const totalGiving = Object.values(campuses).reduce(
    (sum, campus) => sum + campus.giving,
    0
  );

  return {
    periodStart,
    givers: null,
    totalGiving,
    expenses: null,
    campuses,
  };
}

function parseCampusLegacyBlock(row: string[]): ParsedGivingMonth | null {
  if (row[8]?.trim()) return null;
  const periodStart = parseSheetMonth(row[0] ?? "");
  if (!periodStart) return null;

  const mpGiving = parseMoney(row[4]);
  const almaGiving = parseMoney(row[5]);
  if (mpGiving === null && almaGiving === null) return null;

  const campuses: ParsedGivingMonth["campuses"] = {};
  if (mpGiving !== null) {
    campuses["mount-pleasant"] = {
      giving: mpGiving,
      attendance: parseCount(row[1]) ?? undefined,
    };
  }
  if (almaGiving !== null) {
    campuses["alma"] = {
      giving: almaGiving,
      attendance: parseCount(row[2]) ?? undefined,
    };
  }

  const totalGiving = Object.values(campuses).reduce(
    (sum, campus) => sum + campus.giving,
    0
  );

  return {
    periodStart,
    givers: null,
    totalGiving,
    expenses: null,
    campuses,
  };
}

function mergeGivingMonths(
  target: ParsedGivingMonth,
  source: ParsedGivingMonth
): ParsedGivingMonth {
  return {
    periodStart: target.periodStart,
    givers: target.givers ?? source.givers,
    totalGiving: target.totalGiving ?? source.totalGiving,
    expenses: target.expenses ?? source.expenses,
    campuses: {
      ...source.campuses,
      ...target.campuses,
    },
  };
}

export function parseAmountsRows(rows: string[][]): ParsedGivingMonth[] {
  const byMonth = new Map<string, ParsedGivingMonth>();

  for (const row of rows) {
    for (const parser of [parseAmountsPrimaryBlock, parseAmountsSecondaryBlock]) {
      const parsed = parser(row);
      if (!parsed) continue;
      const existing = byMonth.get(parsed.periodStart);
      byMonth.set(
        parsed.periodStart,
        existing ? mergeGivingMonths(existing, parsed) : parsed
      );
    }
  }

  return [...byMonth.values()].sort((a, b) =>
    a.periodStart.localeCompare(b.periodStart)
  );
}

export function parseCampusRows(rows: string[][]): ParsedGivingMonth[] {
  const byMonth = new Map<string, ParsedGivingMonth>();

  for (const row of rows) {
    for (const parser of [parseCampusModernBlock, parseCampusLegacyBlock]) {
      const parsed = parser(row);
      if (!parsed) continue;
      const existing = byMonth.get(parsed.periodStart);
      byMonth.set(
        parsed.periodStart,
        existing ? mergeGivingMonths(existing, parsed) : parsed
      );
    }
  }

  return [...byMonth.values()].sort((a, b) =>
    a.periodStart.localeCompare(b.periodStart)
  );
}

export function mergeAmountsAndCampus(
  amounts: ParsedGivingMonth[],
  campus: ParsedGivingMonth[]
): ParsedGivingMonth[] {
  const byMonth = new Map<string, ParsedGivingMonth>();

  for (const month of amounts) {
    byMonth.set(month.periodStart, month);
  }

  for (const month of campus) {
    const existing = byMonth.get(month.periodStart);
    if (existing) {
      byMonth.set(month.periodStart, mergeGivingMonths(existing, month));
    } else {
      byMonth.set(month.periodStart, month);
    }
  }

  for (const month of byMonth.values()) {
    if (month.totalGiving !== null || Object.keys(month.campuses).length === 0) {
      continue;
    }
    month.totalGiving = Object.values(month.campuses).reduce(
      (sum, campus) => sum + campus.giving,
      0
    );
  }

  return [...byMonth.values()].sort((a, b) =>
    a.periodStart.localeCompare(b.periodStart)
  );
}

function fiscalYearBudgetSearchTerms(fiscalYearLabel: string): string[] {
  const match = fiscalYearLabel.match(/^FY(\d{2})\/(\d{2})$/i);
  if (!match) return [fiscalYearLabel];

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  const fullStart = 2000 + startYear;
  const fullEnd = 2000 + endYear;

  return [
    fiscalYearLabel,
    `FY ${fullStart}/${fullEnd}`,
    `FY ${startYear}/${endYear}`,
    `${fullStart}/${fullEnd}`,
    `${startYear}/${endYear}`,
  ];
}

function rowContainsBudgetLabel(row: string[], searchTerms: string[]): boolean {
  const rowText = row.join(" ");
  if (!/total budgeted income/i.test(rowText)) return false;
  return searchTerms.some((term) => rowText.includes(term));
}

function firstMoneyValueInRow(row: string[], startIndex = 0): number | null {
  for (let index = startIndex; index < row.length; index += 1) {
    const amount = parseMoney(row[index]);
    if (amount != null && amount > 0) return amount;
  }
  return null;
}

function countMoneyCells(row: string[]): number {
  let count = 0;
  for (const cell of row) {
    if (parseMoney(cell) != null) count += 1;
  }
  return count;
}

export function parseAmountsBudgetIncomeColumn(rows: string[][]): number | null {
  // Annual budget sits on a sparse row: only prior-FY (col H) and current-FY (col Q)
  // dollar amounts. Scan the whole sheet and keep the last match so we get the
  // active budget row (e.g. $3,871,753.30 | $4,327,219.59), not older FY pairs.
  let annualBudget: number | null = null;

  for (const row of rows) {
    if (parseSheetMonth(row[0] ?? "") || parseSheetMonth(row[9] ?? "")) {
      continue;
    }

    const primary = parseMoney(row[7]);
    const secondary = parseMoney(row[16]);
    if (primary == null || secondary == null) continue;
    if (countMoneyCells(row) !== 2) continue;
    if (secondary < 3_000_000 || primary < 3_000_000) continue;

    annualBudget = secondary;
  }

  return annualBudget;
}

export function parseAccountsBudgetIncome(
  rows: string[][],
  fiscalYearLabel: string
): number | null {
  const searchTerms = fiscalYearBudgetSearchTerms(fiscalYearLabel);

  for (const row of rows) {
    if (!rowContainsBudgetLabel(row, searchTerms)) continue;

    for (let index = 0; index < row.length; index += 1) {
      const cell = row[index]?.trim() ?? "";
      if (!/total budgeted income/i.test(cell)) continue;

      const amountInLabel = parseMoney(cell.replace(/total budgeted income/gi, ""));
      if (amountInLabel != null && amountInLabel > 0) {
        return amountInLabel;
      }

      const amountAfterLabel = firstMoneyValueInRow(row, index + 1);
      if (amountAfterLabel != null) return amountAfterLabel;
    }

    const amounts = row
      .map((cell) => parseMoney(cell))
      .filter((value): value is number => value != null && value > 0);
    if (amounts.length > 0) {
      return Math.max(...amounts);
    }
  }

  return null;
}

export async function fetchGivingAnnualBudget(
  fiscalYearLabel: string
): Promise<number | null> {
  const [accountsRows, amountsRows] = await Promise.all([
    fetchSheetCsv("Accounts"),
    fetchSheetCsv("Amounts"),
  ]);

  for (const rows of [amountsRows, accountsRows]) {
    const columnBudget = parseAmountsBudgetIncomeColumn(rows);
    if (columnBudget != null) return columnBudget;

    const labeled = parseAccountsBudgetIncome(rows, fiscalYearLabel);
    if (labeled != null) return labeled;
  }

  return null;
}

async function fetchSheetCsv(sheetName: string): Promise<string[][]> {
  const sheetId = getSheetId();
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(`Failed to fetch giving sheet tab "${sheetName}"`);
  }
  return parseCsvRows(await response.text());
}

export async function fetchParsedGivingData(): Promise<ParsedGivingMonth[]> {
  const [amountsRows, campusRows] = await Promise.all([
    fetchSheetCsv("Amounts"),
    fetchSheetCsv("Alma v MP v SJ Campus"),
  ]);

  return mergeAmountsAndCampus(
    parseAmountsRows(amountsRows),
    parseCampusRows(campusRows)
  );
}

export { CAMPUS_ORDER };
