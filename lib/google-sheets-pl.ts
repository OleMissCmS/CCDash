import { inflateRawSync } from "node:zlib";
import {
  expenseCampusFromAccountNumber,
  ministryAreaLabel,
  ministryCodeFromAccountNumber,
  type ExpenseCampusSlug,
} from "./expense-accounts";

const DEFAULT_SHEET_ID = "1azEP174bUw-LvAmYeKRHyvSgdPvTmExR";
const FALLBACK_WORKSHEET = "Budget vs. Actuals";
const MONTH_TAB_PATTERN = /^([A-Za-z]+)\s+(\d{4})$/;

export type ParsedPlAccount = {
  accountNumber: string;
  label: string;
  campusSlug: ExpenseCampusSlug;
  ministryCode: string;
  ministryAreaLabel: string;
  actual: number;
  budget: number;
  variance: number;
  percentOfBudget: number | null;
  monthlyActuals: Record<string, number>;
};

export type ParsedPlPeriod = {
  id: string;
  label: string;
};

export type ParsedProfitAndLoss = {
  sheetTitle: string;
  periodRangeLabel: string;
  worksheetName: string;
  periods: ParsedPlPeriod[];
  accounts: ParsedPlAccount[];
  warnings: string[];
};

function getSheetId(): string {
  return process.env.GOOGLE_SHEETS_PL_ID ?? DEFAULT_SHEET_ID;
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

function parsePercent(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/%/g, "");
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
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

export function parseMonthTabName(name: string): ParsedPlPeriod | null {
  const match = name.trim().match(MONTH_TAB_PATTERN);
  if (!match) return null;

  const parsed = new Date(`${match[1]} 1, ${match[2]}`);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = parsed.getMonth() + 1;
  return {
    id: `${year}-${String(month).padStart(2, "0")}-01`,
    label: parsed.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
}

function readZipEntry(data: Uint8Array, targetPath: string): Uint8Array | null {
  const localHeader = 0x04034b50;
  let offset = 0;

  while (offset + 30 <= data.length) {
    const view = new DataView(data.buffer, data.byteOffset + offset, 30);
    if (view.getUint32(0, true) !== localHeader) break;

    const compression = view.getUint16(8, true);
    const compressedSize = view.getUint32(18, true);
    const nameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const name = new TextDecoder().decode(
      data.subarray(offset + 30, offset + 30 + nameLength)
    );
    const dataStart = offset + 30 + nameLength + extraLength;
    const compressed = data.subarray(dataStart, dataStart + compressedSize);

    if (name === targetPath) {
      if (compression === 0) return compressed;
      if (compression === 8) return inflateRawSync(compressed);
      return null;
    }

    offset = dataStart + compressedSize;
  }

  return null;
}

export async function fetchWorksheetNames(): Promise<string[]> {
  const sheetId = getSheetId();
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error("Failed to fetch P&L workbook metadata");
  }

  const workbookXml = readZipEntry(
    new Uint8Array(await response.arrayBuffer()),
    "xl/workbook.xml"
  );
  if (!workbookXml) return [FALLBACK_WORKSHEET];

  const xml = new TextDecoder().decode(workbookXml);
  const names = [...xml.matchAll(/<sheet[^>]*name="([^"]+)"/g)].map(
    (match) => match[1].replace(/&amp;/g, "&")
  );
  return names.length > 0 ? names : [FALLBACK_WORKSHEET];
}

export async function resolveLatestMonthlyWorksheet(): Promise<{
  worksheetName: string;
  period: ParsedPlPeriod | null;
  availableMonthTabs: ParsedPlPeriod[];
}> {
  const worksheetNames = await fetchWorksheetNames();
  const monthTabs = worksheetNames
    .map((name) => ({ name, period: parseMonthTabName(name) }))
    .filter(
      (entry): entry is { name: string; period: ParsedPlPeriod } =>
        entry.period != null
    )
    .sort((a, b) => a.period.id.localeCompare(b.period.id));

  if (monthTabs.length === 0) {
    return {
      worksheetName: worksheetNames[worksheetNames.length - 1] ?? FALLBACK_WORKSHEET,
      period: null,
      availableMonthTabs: [],
    };
  }

  const latest = monthTabs[monthTabs.length - 1];
  return {
    worksheetName: latest.name,
    period: latest.period,
    availableMonthTabs: monthTabs.map((entry) => entry.period),
  };
}

function parseSheetMonth(raw: string): ParsedPlPeriod | null {
  const trimmed = raw.trim();
  const longMatch = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/i);
  if (!longMatch) return null;

  const parsed = new Date(`${longMatch[1]} 1, ${longMatch[2]}`);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = parsed.getMonth() + 1;
  return {
    id: `${year}-${String(month).padStart(2, "0")}-01`,
    label: parsed.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
  };
}

function extractPeriodRangeLabel(rows: string[][]): string {
  for (let i = 0; i < Math.min(rows.length, 5); i += 1) {
    const text = rows[i].join(" ");
    const match = text.match(
      /([A-Za-z]{3,9}\s+\d{4}\s*-\s*[A-Za-z]{3,9}\s+\d{4})/i
    );
    if (match) return match[1];
  }
  return "Current fiscal year";
}

function detectPeriodColumns(
  rows: string[][]
): { periods: ParsedPlPeriod[]; actualColumnIndexes: number[] } {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 12); rowIndex += 1) {
    const row = rows[rowIndex];
    const monthColumns: Array<{ index: number; period: ParsedPlPeriod }> = [];

    for (let col = 1; col < row.length; col += 1) {
      const period = parseSheetMonth(row[col] ?? "");
      if (period) {
        monthColumns.push({ index: col, period });
      }
    }

    if (monthColumns.length >= 2) {
      return {
        periods: monthColumns.map((entry) => entry.period),
        actualColumnIndexes: monthColumns.map((entry) => entry.index),
      };
    }
  }

  const headerRow = rows.find((row) =>
    row.some((cell) => /actual/i.test(cell))
  );
  const actualIndex = headerRow?.findIndex((cell) => /actual/i.test(cell)) ?? 1;

  return {
    periods: [{ id: "ytd", label: "YTD actual" }],
    actualColumnIndexes: [Math.max(actualIndex, 1)],
  };
}

function parseAccountLabel(cell: string): {
  accountNumber: string;
  label: string;
} | null {
  const match = cell.match(/^\s*(\d{4,6})\s+(.+)$/);
  if (!match) return null;
  return {
    accountNumber: match[1],
    label: match[2].trim(),
  };
}

export function parseProfitAndLossRows(
  rows: string[][],
  options?: {
    worksheetName?: string;
    activePeriod?: ParsedPlPeriod | null;
    availableMonthTabs?: ParsedPlPeriod[];
  }
): ParsedProfitAndLoss {
  const warnings: string[] = [];
  const sheetTitle = rows[0]?.[0]?.trim() ?? "Profit & Loss";
  const periodRangeLabel = extractPeriodRangeLabel(rows);
  const worksheetName = options?.worksheetName ?? FALLBACK_WORKSHEET;
  const { periods, actualColumnIndexes } = detectPeriodColumns(rows);

  if (options?.activePeriod) {
    periods.splice(0, periods.length, options.activePeriod);
    actualColumnIndexes.splice(0, actualColumnIndexes.length, 1);
  } else if (periods.length === 1 && periods[0].id === "ytd") {
    warnings.push(
      "Using the YTD tab. Add a monthly tab at the bottom of the workbook (for example, “August 2026”) and the dashboard will switch to it automatically."
    );
  }

  const budgetColumnIndex =
    rows
      .find((row) => row.some((cell) => /^budget$/i.test(cell.trim())))
      ?.findIndex((cell) => /^budget$/i.test(cell.trim())) ?? 2;

  const accounts: ParsedPlAccount[] = [];

  for (const row of rows) {
    const parsedLabel = parseAccountLabel(row[0] ?? "");
    if (!parsedLabel) continue;

    const campusSlug = expenseCampusFromAccountNumber(parsedLabel.accountNumber);
    const ministryCode = ministryCodeFromAccountNumber(
      parsedLabel.accountNumber
    );
    if (!campusSlug || !ministryCode) continue;

    const monthlyActuals: Record<string, number> = {};
    periods.forEach((period, index) => {
      const amount = parseMoney(row[actualColumnIndexes[index]]);
      if (amount != null) {
        monthlyActuals[period.id] = amount;
      }
    });

    const actual =
      monthlyActuals[periods[periods.length - 1]?.id ?? "ytd"] ??
      parseMoney(row[actualColumnIndexes[0]]) ??
      0;
    const budget = parseMoney(row[budgetColumnIndex]) ?? 0;
    const variance = actual - budget;
    const percentOfBudget =
      parsePercent(row[budgetColumnIndex + 2]) ??
      (budget !== 0 ? (actual / budget) * 100 : null);

    accounts.push({
      accountNumber: parsedLabel.accountNumber,
      label: parsedLabel.label,
      campusSlug,
      ministryCode,
      ministryAreaLabel: ministryAreaLabel(ministryCode),
      actual,
      budget,
      variance,
      percentOfBudget,
      monthlyActuals,
    });
  }

  return {
    sheetTitle,
    periodRangeLabel,
    worksheetName,
    periods,
    accounts,
    warnings,
  };
}

export async function fetchProfitAndLossSheet(
  worksheetName?: string
): Promise<string[][]> {
  const sheetId = getSheetId();
  const sheet = worksheetName ?? FALLBACK_WORKSHEET;
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const response = await fetch(url, { next: { revalidate: 0 } });

  if (!response.ok) {
    throw new Error(`Failed to fetch profit and loss sheet for ${sheet}`);
  }

  return parseCsvRows(await response.text());
}

export async function fetchParsedProfitAndLoss(
  worksheetName?: string,
  activePeriod?: ParsedPlPeriod | null,
  availableMonthTabs: ParsedPlPeriod[] = []
): Promise<ParsedProfitAndLoss> {
  const rows = await fetchProfitAndLossSheet(worksheetName);
  return parseProfitAndLossRows(rows, {
    worksheetName,
    activePeriod,
    availableMonthTabs,
  });
}

export async function fetchLatestMonthlyProfitAndLoss(): Promise<ParsedProfitAndLoss> {
  const latest = await resolveLatestMonthlyWorksheet();
  return fetchParsedProfitAndLoss(
    latest.worksheetName,
    latest.period,
    latest.availableMonthTabs
  );
}
