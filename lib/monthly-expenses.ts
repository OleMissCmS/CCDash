import type { StoplightStatus } from "./benchmarks";
import {
  EXPENSE_CAMPUSES,
  expenseCampusLabel,
  isRegionalExpenseCampus,
  ministryAreaLabel,
  sortMinistryGroups,
  type ExpenseCampusSlug,
} from "./expense-accounts";
import { getExpenseBudgetPaceStatus } from "./expense-budget-pace";
import {
  fetchParsedProfitAndLoss,
  fetchWorksheetNames,
  parseMonthTabName,
  resolveLatestMonthlyWorksheet,
  type ParsedPlAccount,
  type ParsedPlPeriod,
} from "./google-sheets-pl";
import {
  getFinancialsAsOfLabel,
  getFinancialsAsOfMonthStart,
  getFiscalYearMonthsElapsedThroughMonth,
  getFiscalYearPercentElapsedThroughMonth,
} from "./periods";
import { DEFAULT_FISCAL_YEAR } from "./types";

export type MinistryAreaExpenseAccount = ParsedPlAccount & {
  percentOfBudget: number | null;
  paceStatus: StoplightStatus;
};

export type MinistryAreaExpenseGroup = {
  ministryCode: string;
  label: string;
  accountPrefix: string;
  actual: number;
  budget: number;
  variance: number;
  percentOfBudget: number;
  paceStatus: StoplightStatus;
  paceLabel: string;
  accountCount: number;
  accounts: MinistryAreaExpenseAccount[];
};

export type MonthlyExpensesView = {
  campusSlug: ExpenseCampusSlug;
  campusLabel: string;
  fiscalYearLabel: string;
  fiscalYearPercentElapsed: number;
  monthsElapsed: number;
  sheetTitle: string;
  periodRangeLabel: string;
  worksheetName: string;
  periods: ParsedPlPeriod[];
  selectedPeriodId: string;
  selectedPeriodLabel: string;
  asOfLabel: string;
  availableMonthTabs: ParsedPlPeriod[];
  allowedCampuses: ExpenseCampusSlug[];
  showCampusSummary: boolean;
  campusAccounts: MinistryAreaExpenseAccount[];
  groups: MinistryAreaExpenseGroup[];
  totals: {
    actual: number;
    budget: number;
    variance: number;
    percentOfBudget: number | null;
    paceStatus: StoplightStatus;
    paceLabel: string;
  };
  warnings: string[];
  source: "google_sheets" | "unavailable";
};

function asOfLabelForPeriod(selectedPeriodId: string): string {
  return getFinancialsAsOfLabel(selectedPeriodId);
}

function fiscalPaceForPeriod(
  fiscalYearLabel: string,
  selectedPeriodId: string
): { monthsElapsed: number; fiscalYearPercentElapsed: number } {
  const asOfMonth = getFinancialsAsOfMonthStart(selectedPeriodId);
  const monthsElapsed = getFiscalYearMonthsElapsedThroughMonth(
    fiscalYearLabel,
    asOfMonth
  );
  return {
    monthsElapsed,
    fiscalYearPercentElapsed: getFiscalYearPercentElapsedThroughMonth(
      fiscalYearLabel,
      asOfMonth
    ),
  };
}

function sortCampusAccounts(
  accounts: MinistryAreaExpenseAccount[]
): MinistryAreaExpenseAccount[] {
  return [...accounts].sort((a, b) =>
    a.accountNumber.localeCompare(b.accountNumber, undefined, { numeric: true })
  );
}

function amountForPeriod(account: ParsedPlAccount, periodId: string): number {
  return account.monthlyActuals[periodId] ?? account.actual;
}

function enrichAccount(
  account: ParsedPlAccount,
  periodId: string,
  fiscalYearPercentElapsed: number
): MinistryAreaExpenseAccount {
  const actual = amountForPeriod(account, periodId);
  const pace = getExpenseBudgetPaceStatus(
    actual,
    account.budget,
    fiscalYearPercentElapsed
  );

  return {
    ...account,
    actual,
    variance: actual - account.budget,
    percentOfBudget: account.budget !== 0 ? pace.percentOfBudget : null,
    paceStatus: pace.status,
  };
}

function groupAccountsByMinistry(
  accounts: ParsedPlAccount[],
  periodId: string,
  campusSlug: ExpenseCampusSlug,
  fiscalYearPercentElapsed: number
): MinistryAreaExpenseGroup[] {
  const grouped = new Map<string, MinistryAreaExpenseGroup>();

  for (const account of accounts) {
    const enriched = enrichAccount(account, periodId, fiscalYearPercentElapsed);
    const existing = grouped.get(account.ministryCode);

    if (!existing) {
      const pace = getExpenseBudgetPaceStatus(
        enriched.actual,
        enriched.budget,
        fiscalYearPercentElapsed
      );
      grouped.set(account.ministryCode, {
        ministryCode: account.ministryCode,
        label: ministryAreaLabel(account.ministryCode),
        accountPrefix: `${EXPENSE_CAMPUSES.find((c) => c.slug === campusSlug)?.accountDigit ?? "1"}${account.ministryCode}`,
        actual: enriched.actual,
        budget: enriched.budget,
        variance: enriched.variance,
        percentOfBudget: pace.percentOfBudget,
        paceStatus: pace.status,
        paceLabel: pace.label,
        accountCount: 1,
        accounts: [enriched],
      });
      continue;
    }

    existing.actual += enriched.actual;
    existing.budget += enriched.budget;
    existing.variance += enriched.variance;
    existing.accountCount += 1;
    existing.accounts.push(enriched);

    const pace = getExpenseBudgetPaceStatus(
      existing.actual,
      existing.budget,
      fiscalYearPercentElapsed
    );
    existing.percentOfBudget = pace.percentOfBudget;
    existing.paceStatus = pace.status;
    existing.paceLabel = pace.label;
  }

  return sortMinistryGroups(
    [...grouped.values()].filter(
      (group) => group.actual !== 0 || group.budget !== 0
    )
  );
}

async function resolveWorksheetForPeriod(
  periodIdInput?: string | null
): Promise<{
  worksheetName: string;
  activePeriod: ParsedPlPeriod | null;
  availableMonthTabs: ParsedPlPeriod[];
}> {
  const latest = await resolveLatestMonthlyWorksheet();

  if (!periodIdInput || latest.availableMonthTabs.length === 0) {
    return {
      worksheetName: latest.worksheetName,
      activePeriod: latest.period,
      availableMonthTabs: latest.availableMonthTabs,
    };
  }

  const requested = latest.availableMonthTabs.find(
    (period) => period.id === periodIdInput
  );
  if (!requested) {
    return {
      worksheetName: latest.worksheetName,
      activePeriod: latest.period,
      availableMonthTabs: latest.availableMonthTabs,
    };
  }

  const worksheetNames = await fetchWorksheetNames();
  const worksheetName = worksheetNames.find((name) => {
    return parseMonthTabName(name)?.id === requested.id;
  });

  if (!worksheetName) {
    return {
      worksheetName: latest.worksheetName,
      activePeriod: latest.period,
      availableMonthTabs: latest.availableMonthTabs,
    };
  }

  return {
    worksheetName,
    activePeriod: requested,
    availableMonthTabs: latest.availableMonthTabs,
  };
}

export async function getMonthlyExpensesView(
  campusSlug: ExpenseCampusSlug,
  allowedCampuses: ExpenseCampusSlug[],
  periodIdInput?: string | null
): Promise<MonthlyExpensesView> {
  const effectiveCampus = allowedCampuses.includes(campusSlug)
    ? campusSlug
    : (allowedCampuses[0] ?? "central");

  const fiscalYearLabel = DEFAULT_FISCAL_YEAR;

  try {
    const worksheet = await resolveWorksheetForPeriod(periodIdInput);
    const parsed = await fetchParsedProfitAndLoss(
      worksheet.worksheetName,
      worksheet.activePeriod,
      worksheet.availableMonthTabs
    );

    const selectedPeriodId =
      worksheet.activePeriod?.id ??
      parsed.periods[parsed.periods.length - 1]?.id ??
      "ytd";
    const selectedPeriod = parsed.periods.find(
      (period) => period.id === selectedPeriodId
    );
    const { monthsElapsed, fiscalYearPercentElapsed } = fiscalPaceForPeriod(
      fiscalYearLabel,
      selectedPeriodId
    );

    const campusAccounts = parsed.accounts.filter(
      (account) => account.campusSlug === effectiveCampus
    );
    const groups = groupAccountsByMinistry(
      campusAccounts,
      selectedPeriodId,
      effectiveCampus,
      fiscalYearPercentElapsed
    );
    const enrichedCampusAccounts = sortCampusAccounts(
      campusAccounts.map((account) =>
        enrichAccount(account, selectedPeriodId, fiscalYearPercentElapsed)
      )
    );
    const selectedPeriodLabel =
      selectedPeriod?.label ??
      worksheet.activePeriod?.label ??
      "YTD actual";
    const asOfLabel = asOfLabelForPeriod(selectedPeriodId);

    const totalsActual = groups.reduce((sum, group) => sum + group.actual, 0);
    const totalsBudget = groups.reduce((sum, group) => sum + group.budget, 0);
    const totalsPace = getExpenseBudgetPaceStatus(
      totalsActual,
      totalsBudget,
      fiscalYearPercentElapsed
    );

    const warnings = [...parsed.warnings];
    if (worksheet.activePeriod) {
      warnings.unshift(
        `Showing ${worksheet.activePeriod.label} from the “${worksheet.worksheetName}” tab.`
      );
    }

    return {
      campusSlug: effectiveCampus,
      campusLabel: expenseCampusLabel(effectiveCampus),
      fiscalYearLabel,
      fiscalYearPercentElapsed,
      monthsElapsed,
      sheetTitle: parsed.sheetTitle,
      periodRangeLabel: parsed.periodRangeLabel,
      worksheetName: parsed.worksheetName,
      periods: parsed.periods,
      selectedPeriodId,
      selectedPeriodLabel,
      asOfLabel,
      availableMonthTabs: worksheet.availableMonthTabs,
      allowedCampuses,
      showCampusSummary: isRegionalExpenseCampus(effectiveCampus),
      campusAccounts: enrichedCampusAccounts,
      groups,
      totals: {
        actual: totalsActual,
        budget: totalsBudget,
        variance: totalsActual - totalsBudget,
        percentOfBudget:
          totalsBudget !== 0 ? totalsPace.percentOfBudget : null,
        paceStatus: totalsPace.status,
        paceLabel: totalsPace.label,
      },
      warnings,
      source: "google_sheets",
    };
  } catch {
    return {
      campusSlug: effectiveCampus,
      campusLabel: expenseCampusLabel(effectiveCampus),
      fiscalYearLabel,
      fiscalYearPercentElapsed: 0,
      monthsElapsed: 0,
      sheetTitle: "Profit & Loss",
      periodRangeLabel: "Unavailable",
      worksheetName: "Budget vs. Actuals",
      periods: [{ id: "ytd", label: "YTD actual" }],
      selectedPeriodId: "ytd",
      selectedPeriodLabel: "YTD actual",
      asOfLabel: asOfLabelForPeriod("ytd"),
      availableMonthTabs: [],
      allowedCampuses,
      showCampusSummary: isRegionalExpenseCampus(effectiveCampus),
      campusAccounts: [],
      groups: [],
      totals: {
        actual: 0,
        budget: 0,
        variance: 0,
        percentOfBudget: null,
        paceStatus: "yellow",
        paceLabel: "Within one month",
      },
      warnings: [
        "Unable to load the P&L sheet. Confirm the sheet is shared as “Anyone with the link can view”.",
      ],
      source: "unavailable",
    };
  }
}
