import type { StoplightStatus } from "./benchmarks";

const ONE_MONTH_BUDGET_PCT = 100 / 12;

export type ExpenseBudgetPaceResult = {
  status: StoplightStatus;
  label: string;
  percentOfBudget: number;
};

const PACE_LABELS: Record<StoplightStatus, string> = {
  green: "Under pace",
  yellow: "Within one month",
  red: "Over a month ahead",
};

export function getExpenseBudgetPaceStatus(
  actual: number,
  budget: number,
  fiscalYearPercentElapsed: number
): ExpenseBudgetPaceResult {
  if (budget <= 0) {
    return {
      status: "yellow",
      label: PACE_LABELS.yellow,
      percentOfBudget: 0,
    };
  }

  const percentOfBudget = (actual / budget) * 100;

  let status: StoplightStatus;
  if (percentOfBudget < fiscalYearPercentElapsed) {
    status = "green";
  } else if (percentOfBudget < fiscalYearPercentElapsed + ONE_MONTH_BUDGET_PCT) {
    status = "yellow";
  } else {
    status = "red";
  }

  return {
    status,
    label: PACE_LABELS[status],
    percentOfBudget,
  };
}

export function expensePaceTextClass(status: StoplightStatus): string {
  switch (status) {
    case "green":
      return "text-success";
    case "yellow":
      return "text-warning";
    case "red":
      return "text-error";
  }
}
