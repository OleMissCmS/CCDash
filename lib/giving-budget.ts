import type { StoplightStatus } from "./benchmarks";

export type GivingBudgetPaceResult = {
  status: StoplightStatus;
  label: string;
  percentOfBudget: number;
  actualYtd: number;
  annualBudget: number;
  expectedYtd: number;
  monthsElapsed: number;
  fiscalYearLabel: string;
};

const PACE_LABELS: Record<StoplightStatus, string> = {
  green: "On pace",
  yellow: "Within one month",
  red: "Behind pace",
};

export function getGivingBudgetPaceStatus(
  actualYtd: number,
  annualBudget: number,
  monthsElapsed: number,
  fiscalYearLabel: string
): GivingBudgetPaceResult {
  if (annualBudget <= 0) {
    return {
      status: "yellow",
      label: PACE_LABELS.yellow,
      percentOfBudget: 0,
      actualYtd,
      annualBudget,
      expectedYtd: 0,
      monthsElapsed,
      fiscalYearLabel,
    };
  }

  const percentOfBudget = (actualYtd / annualBudget) * 100;
  const expectedYtd = annualBudget * (monthsElapsed / 12);
  const oneMonthBudget = annualBudget / 12;

  let status: StoplightStatus;
  if (actualYtd >= expectedYtd) {
    status = "green";
  } else if (actualYtd >= expectedYtd - oneMonthBudget) {
    status = "yellow";
  } else {
    status = "red";
  }

  return {
    status,
    label: PACE_LABELS[status],
    percentOfBudget,
    actualYtd,
    annualBudget,
    expectedYtd,
    monthsElapsed,
    fiscalYearLabel,
  };
}
