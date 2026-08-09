"use client";

import { useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import type { StoplightResult } from "@/lib/benchmarks";
import {
  defaultCardPeriod,
  showBenchmarkForCardPeriod,
  supportsCardPeriodSelect,
  CARD_PERIOD_LABELS,
  CARD_PERIOD_RANGES,
  getCardPeriodDescription,
  getCardPeriodLabel,
  type CardPeriodRange,
} from "@/lib/card-periods";
import type { Metric } from "@/lib/types";

type KpiCardWithPeriodProps = {
  metric: Metric;
  valuesByPeriod: Record<CardPeriodRange, number | null>;
  target?: number | null;
  benchmark?: number | null;
  stoplightByPeriod?: Partial<Record<CardPeriodRange, StoplightResult | null>>;
  benchmarkLabel?: string | null;
  campusLabel?: string | null;
};

export function KpiCardWithPeriod({
  metric,
  valuesByPeriod,
  benchmark,
  stoplightByPeriod,
  benchmarkLabel,
  campusLabel,
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
    subtitle = "Previous calendar month";
  }

  return (
    <div className="space-y-2">
      {canSelectPeriod && (
        <label className="flex items-center justify-end gap-2 text-xs text-base-content/60">
          <span className="sr-only">Time period for {metric.label}</span>
          <select
            className="select select-bordered select-xs max-w-[10.5rem]"
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as CardPeriodRange)
            }
            aria-label={`Time period for ${metric.label}`}
          >
            {CARD_PERIOD_RANGES.map((option) => (
              <option key={option} value={option}>
                {getCardPeriodLabel(option, metric.key, metric.unit)}
              </option>
            ))}
          </select>
        </label>
      )}
      <KpiCard
        metric={metric}
        value={value}
        benchmark={showBenchmark ? benchmark : null}
        stoplight={stoplight}
        benchmarkLabel={showBenchmark ? benchmarkLabel : null}
        subtitle={subtitle}
      />
    </div>
  );
}
