import { SfdcWidget } from "@/components/sfdc/SfdcWidget";
import { getGivingBudgetPaceStatus } from "@/lib/giving-budget";
import { formatCurrency } from "@/lib/format";
import {
  getFiscalYearMonthsElapsed,
  getFiscalYearPercentElapsed,
} from "@/lib/periods";

type GivingBudgetProgressCardProps = {
  fiscalYearLabel: string;
  actualYtd: number;
  annualBudget: number;
  campusLabel?: string | null;
  referenceDate?: Date;
};

function formatFiscalYearLabel(fiscalYearLabel: string): string {
  const match = fiscalYearLabel.match(/^FY(\d{2})\/(\d{2})$/i);
  if (!match) return fiscalYearLabel;
  return `FY 20${match[1]}/20${match[2]}`;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function GivingBudgetProgressCard({
  fiscalYearLabel,
  actualYtd,
  annualBudget,
  campusLabel,
  referenceDate = new Date(),
}: GivingBudgetProgressCardProps) {
  const scopeLabel = campusLabel ?? "Church-wide";
  const percentOfBudget =
    annualBudget > 0 ? (actualYtd / annualBudget) * 100 : 0;
  const barFill = clampPercent(percentOfBudget);
  const monthsElapsed = getFiscalYearMonthsElapsed(
    fiscalYearLabel,
    referenceDate
  );
  const percentThroughFy = clampPercent(
    getFiscalYearPercentElapsed(fiscalYearLabel, referenceDate)
  );
  const paceDelta = percentOfBudget - percentThroughFy;
  const pace = getGivingBudgetPaceStatus(
    actualYtd,
    annualBudget,
    monthsElapsed,
    fiscalYearLabel
  );
  const paceLabel =
    Math.abs(paceDelta) < 0.5
      ? "On pace"
      : paceDelta > 0
        ? `${paceDelta.toFixed(1)} pts ahead of pace`
        : `${Math.abs(paceDelta).toFixed(1)} pts behind pace`;

  return (
    <SfdcWidget
      title={`${formatFiscalYearLabel(fiscalYearLabel)} budgeted income`}
      className="sfdc-kpi-card giving-budget-card"
    >
      <p className="sfdc-kpi-value tabular-nums">
        {formatCurrency(actualYtd)}
      </p>
      <p className="sfdc-kpi-meta giving-budget-card__meta">
        of {formatCurrency(annualBudget)} budgeted income · {scopeLabel} ·{" "}
        {monthsElapsed} {monthsElapsed === 1 ? "month" : "months"} into FY (
        {percentThroughFy.toFixed(1)}%)
      </p>

      <div className="giving-budget-progress">
        <div
          className="giving-budget-progress__track"
          role="img"
          aria-label={`Giving is ${percentOfBudget.toFixed(1)}% of the annual budget. ${percentThroughFy.toFixed(1)}% of the fiscal year has elapsed. ${paceLabel}.`}
        >
          <div
            className={`giving-budget-progress__fill giving-budget-progress__fill--${pace.status}`}
            style={{ width: `${barFill}%` }}
          />
          <div
            className="giving-budget-progress__marker giving-budget-progress__marker--expected"
            style={{ left: `${percentThroughFy}%` }}
            title={`Expected pace: ${percentThroughFy.toFixed(1)}% of FY`}
          />
          <div
            className="giving-budget-progress__marker giving-budget-progress__marker--actual"
            style={{ left: `${barFill}%` }}
            title={`Actual giving: ${percentOfBudget.toFixed(1)}% of budget`}
          />
        </div>

        <div className="giving-budget-progress__footer">
          <div className="giving-budget-progress__legend">
            <span className="giving-budget-progress__legend-item">
              <span
                className="giving-budget-progress__legend-swatch giving-budget-progress__legend-swatch--expected"
                aria-hidden
              />
              Expected ({percentThroughFy.toFixed(1)}%)
            </span>
            <span className="giving-budget-progress__legend-item">
              <span
                className={`giving-budget-progress__legend-swatch giving-budget-progress__legend-swatch--actual giving-budget-progress__legend-swatch--${pace.status}`}
                aria-hidden
              />
              Actual ({percentOfBudget.toFixed(1)}%)
            </span>
          </div>

          <span
            className={`giving-budget-progress__percent giving-budget-progress__percent--${pace.status} tabular-nums`}
          >
            {paceLabel}
          </span>
        </div>

        <div className="giving-budget-progress__labels">
          <span className="tabular-nums">{formatCurrency(0)}</span>
          <span className="tabular-nums">{formatCurrency(annualBudget)}</span>
        </div>
      </div>
    </SfdcWidget>
  );
}
