"use client";

import { useId, useState } from "react";
import { DonutGauge } from "@/components/DonutGauge";
import { ExpenseAccountTable } from "@/components/ExpenseAccountTable";
import { formatValue } from "@/lib/format";
import type {
  MinistryAreaExpenseAccount,
  MonthlyExpensesView,
} from "@/lib/monthly-expenses";

type CampusExpenseSummaryCardProps = {
  campusLabel: string;
  asOfLabel: string;
  fiscalYearLabel: string;
  fiscalYearPercentElapsed: number;
  totals: MonthlyExpensesView["totals"];
  accounts: MinistryAreaExpenseAccount[];
};

function formatCurrency(value: number): string {
  return formatValue(value, "currency");
}

export function CampusExpenseSummaryCard({
  campusLabel,
  asOfLabel,
  fiscalYearLabel,
  fiscalYearPercentElapsed,
  totals,
  accounts,
}: CampusExpenseSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const percentOfBudget = totals.percentOfBudget ?? 0;
  const accountLabel =
    accounts.length === 1 ? "1 line item" : `${accounts.length} line items`;

  return (
    <article className="expense-stoplight-summary">
      <div className="expense-stoplight-summary__main">
        <DonutGauge
          percent={percentOfBudget}
          status={totals.paceStatus}
          size="lg"
          caption="of budget"
          ariaLabel={`${campusLabel}: ${percentOfBudget.toFixed(0)}% of budget spent · ${totals.paceLabel}`}
        />

        <div className="expense-stoplight-summary__copy">
          <h3 className="expense-stoplight-summary__title">
            How each ministry area is pacing against the calendar
          </h3>
          <p className="expense-stoplight-summary__body">
            Every card below compares % of budget spent to how far into the
            fiscal year we are as of {asOfLabel} (
            {fiscalYearPercentElapsed.toFixed(0)}% of year). Green means under
            pace, yellow means within a month&apos;s worth of budget ahead of
            pace, red means more than a month ahead.
          </p>
          <p className="expense-stoplight-summary__totals tabular-nums">
            <span className="expense-stoplight-summary__campus">
              {campusLabel}
            </span>
            : {formatCurrency(totals.actual)} actual of{" "}
            {formatCurrency(totals.budget)} budget ({percentOfBudget.toFixed(1)}
            %) · Variance {formatCurrency(totals.variance)} · {fiscalYearLabel}
          </p>
        </div>
      </div>

      <div className="expense-stoplight-summary__actions">
        <button
          type="button"
          className="sfdc-link"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls={panelId}
        >
          {expanded ? "Hide all accounts" : `View all ${accountLabel}`}
        </button>
        <span
          className={`expense-pace-pill expense-pace-pill--${totals.paceStatus}`}
        >
          {totals.paceLabel}
        </span>
      </div>

      {expanded && (
        <div id={panelId} className="expense-stoplight-summary__details">
          <ExpenseAccountTable
            accounts={accounts}
            showMinistry
            footerLabel={`${campusLabel} total`}
            footerActual={totals.actual}
            footerBudget={totals.budget}
            footerVariance={totals.variance}
            footerPercent={totals.percentOfBudget}
            footerStatus={totals.paceStatus}
          />
        </div>
      )}
    </article>
  );
}
