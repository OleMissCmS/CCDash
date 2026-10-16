"use client";

import { useState, type ReactNode } from "react";
import { KpiCard } from "@/components/KpiCard";
import type { StoplightResult } from "@/lib/benchmarks";
import {
  defaultCardPeriod,
  showBenchmarkForCardPeriod,
  supportsCardPeriodSelect,
  CARD_PERIOD_RANGES,
  getCardPeriodDescription,
  getCardPeriodLabel,
  type CardPeriodRange,
} from "@/lib/card-periods";
import { getPreviousCalendarMonthStart } from "@/lib/periods";
import type { Metric } from "@/lib/types";
import type { BudgetPaceGaugeProps } from "@/components/kpi/types";

function formatPreviousMonthLabel(): string {
  const periodStart = getPreviousCalendarMonthStart();
  return new Date(`${periodStart}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

type KpiCardWithPeriodProps = {
  metric: Metric;
  valuesByPeriod: Record<CardPeriodRange, number | null>;
  target?: number | null;
  benchmark?: number | null;
  stoplightByPeriod?: Partial<Record<CardPeriodRange, StoplightResult | null>>;
  benchmarkLabel?: string | null;
  campusLabel?: string | null;
  budgetPaceGauge?: BudgetPaceGaugeProps | null;
};

export function KpiCardWithPeriod({
  metric,
  valuesByPeriod,
  benchmark,
  stoplightByPeriod,
  benchmarkLabel,
  campusLabel,
  budgetPaceGauge,
}: KpiCardWithPeriodProps) {
  const canSelectPeriod = supportsCardPeriodSelect(metric.key);
  const [period, setPeriod] = useState<CardPeriodRange>(
    defaultCardPeriod(metric.key, metric.unit)
  );

  const displayPeriod = canSelectPeriod
    ? period
    : (CARD_PERIOD_RANGES.find((option) => valuesByPeriod[option] != null) ??
      period);

  const value = valuesByPeriod[displayPeriod];
  if (value == null) return null;

  const showBenchmark = showBenchmarkForCardPeriod(displayPeriod);
  const stoplight = showBenchmark ? (stoplightByPeriod?.[displayPeriod] ?? null) : null;

  let subtitle = getCardPeriodDescription(displayPeriod, metric.key, metric.unit);
  if (campusLabel) {
    subtitle = `${subtitle} · ${campusLabel}`;
  }
  if (metric.key === "giving_previous_month") {
    subtitle = formatPreviousMonthLabel();
    if (campusLabel) {
      subtitle = `${subtitle} · ${campusLabel}`;
    }
  }

  let headerAction: ReactNode = null;
  if (canSelectPeriod) {
    headerAction = (
      <select
        className="sfdc-select text-xs max-w-[9.5rem] h-7 min-h-0 py-0"
        value={period}
        onChange={(event) => setPeriod(event.target.value as CardPeriodRange)}
        aria-label={`Time period for ${metric.label}`}
      >
        {CARD_PERIOD_RANGES.map((option) => (
          <option key={option} value={option}>
            {getCardPeriodLabel(option, metric.key, metric.unit)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <KpiCard
      metric={metric}
      value={value}
      benchmark={showBenchmark ? benchmark : null}
      stoplight={stoplight}
      benchmarkLabel={showBenchmark ? benchmarkLabel : null}
      subtitle={subtitle}
      headerAction={headerAction}
      budgetPaceGauge={budgetPaceGauge}
    />
  );
}
