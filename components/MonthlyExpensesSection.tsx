"use client";

import { useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CampusExpenseSummaryCard } from "@/components/CampusExpenseSummaryCard";
import { DonutGauge } from "@/components/DonutGauge";
import { ExpenseAccountTable } from "@/components/ExpenseAccountTable";
import { SfdcWidget } from "@/components/sfdc/SfdcWidget";
import { formatValue } from "@/lib/format";
import type {
  MinistryAreaExpenseGroup,
  MonthlyExpensesView,
} from "@/lib/monthly-expenses";

/**
 * Layout for ministry cards.
 * - "two-col": default 2-column grid
 * - "full": stacked full-width rows (easy to try / revert)
 */
const MINISTRY_GRID_LAYOUT: "two-col" | "full" = "two-col";

type MonthlyExpensesSectionProps = {
  data: MonthlyExpensesView;
};

function formatCurrency(value: number): string {
  return formatValue(value, "currency");
}

function matchesSearch(
  group: MinistryAreaExpenseGroup,
  query: string
): boolean {
  if (!query) return true;
  const haystack = [
    group.label,
    group.accountPrefix,
    ...group.accounts.flatMap((account) => [
      account.accountNumber,
      account.label,
      account.ministryAreaLabel,
    ]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function filterGroupAccounts(
  group: MinistryAreaExpenseGroup,
  query: string
): MinistryAreaExpenseGroup {
  if (!query) return group;
  const accounts = group.accounts.filter((account) => {
    const haystack = [
      account.accountNumber,
      account.label,
      account.ministryAreaLabel,
      group.label,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
  if (accounts.length === 0) return { ...group, accounts };
  return { ...group, accounts, accountCount: accounts.length };
}

type MinistryExpenseAreaCardProps = {
  group: MinistryAreaExpenseGroup;
  forceExpanded?: boolean;
};

function MinistryExpenseAreaCard({
  group,
  forceExpanded = false,
}: MinistryExpenseAreaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const isOpen = forceExpanded || expanded;
  const lineItemLabel =
    group.accountCount === 1
      ? "1 line item"
      : `${group.accountCount} line items`;

  return (
    <article
      className={`expense-ministry-row ${isOpen ? "expense-ministry-row--open" : ""}`}
    >
      <button
        type="button"
        className="expense-ministry-row__toggle"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <DonutGauge
          percent={group.percentOfBudget}
          status={group.paceStatus}
          size="sm"
          ariaLabel={`${group.label}: ${Math.round(group.percentOfBudget)}% of budget · ${group.paceLabel}`}
        />

        <div className="expense-ministry-row__body">
          <h3 className="expense-ministry-row__title">{group.label}</h3>
          <p className="expense-ministry-row__meta tabular-nums">
            {formatCurrency(group.actual)} of {formatCurrency(group.budget)}{" "}
            budgeted · Variance {formatCurrency(group.variance)} ·{" "}
            {lineItemLabel}
          </p>
        </div>

        <span
          className={`expense-pace-pill expense-pace-pill--${group.paceStatus}`}
        >
          {group.paceLabel}
        </span>

        <span className="expense-ministry-row__chevron" aria-hidden>
          {isOpen ? "▴" : "▾"}
        </span>
      </button>

      {isOpen && (
        <div id={panelId} className="expense-ministry-row__details">
          <ExpenseAccountTable
            accounts={group.accounts}
            footerLabel={`${group.label} total`}
            footerActual={group.actual}
            footerBudget={group.budget}
            footerVariance={group.variance}
            footerPercent={group.percentOfBudget}
            footerStatus={group.paceStatus}
          />
        </div>
      )}
    </article>
  );
}

export function MonthlyExpensesSection({ data }: MonthlyExpensesSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    return data.groups
      .filter((group) => matchesSearch(group, query))
      .map((group) => filterGroupAccounts(group, query))
      .filter((group) => group.accounts.length > 0);
  }, [data.groups, query]);

  function setPeriod(periodId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", periodId);
    router.push(`/monthly-expenses?${params.toString()}`);
  }

  return (
    <section className="space-y-6">
      {data.source === "unavailable" && (
        <div className="alert alert-warning shadow-sm">
          <p className="font-medium">P&L sheet unavailable</p>
          <p className="text-sm opacity-90">
            {data.warnings[0] ??
              "Check that the Google Sheet is published for viewing."}
          </p>
        </div>
      )}

      {data.warnings.length > 0 && data.source === "google_sheets" && (
        <div className="alert alert-info shadow-sm">
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="expense-page-toolbar">
        <div className="expense-page-context">
          <p>
            {data.fiscalYearLabel} · As of {data.asOfLabel} (
            {data.fiscalYearPercentElapsed.toFixed(1)}% of year)
          </p>
        </div>

        {data.availableMonthTabs.length > 1 && (
          <div className="expense-page-periods">
            {data.availableMonthTabs.map((period) => (
              <button
                key={period.id}
                type="button"
                className={`btn btn-sm ${
                  period.id === data.selectedPeriodId
                    ? "btn-primary"
                    : "btn-ghost"
                }`}
                onClick={() => setPeriod(period.id)}
              >
                {period.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {data.showCampusSummary &&
        (data.totals.budget > 0 || data.totals.actual > 0) && (
          <CampusExpenseSummaryCard
            campusLabel={data.campusLabel}
            asOfLabel={data.asOfLabel}
            fiscalYearLabel={data.fiscalYearLabel}
            fiscalYearPercentElapsed={data.fiscalYearPercentElapsed}
            totals={data.totals}
            accounts={data.campusAccounts}
          />
        )}

      {data.groups.length === 0 && (
        <SfdcWidget title="No expenses">
          <p className="text-sm text-base-content/60">
            No expense accounts found for {data.campusLabel} on this tab.
          </p>
        </SfdcWidget>
      )}

      {data.groups.length > 0 && (
        <div className="expense-ministry-section">
          <div className="expense-ministry-section__header">
            <p className="expense-ministry-section__label">
              Ministry breakdown — {data.campusLabel}
            </p>
            <label className="expense-line-search">
              <span className="sr-only">Search this campus&apos;s line items</span>
              <input
                type="search"
                className="expense-line-search__input"
                placeholder="Search this campus's line items…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          {visibleGroups.length === 0 ? (
            <p className="text-sm text-base-content/60">
              No line items match “{search.trim()}”.
            </p>
          ) : (
            <div
              className={`expense-ministry-grid expense-ministry-grid--${MINISTRY_GRID_LAYOUT}`}
            >
              {visibleGroups.map((group) => (
                <MinistryExpenseAreaCard
                  key={group.ministryCode}
                  group={group}
                  forceExpanded={Boolean(query)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
