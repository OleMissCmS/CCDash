"use client";

import {
  parsePeriodRange,
  PERIOD_LABELS,
  PERIOD_RANGES,
  type PeriodRange,
} from "@/lib/periods";
import { useRouter, useSearchParams } from "next/navigation";

export function PeriodToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = parsePeriodRange(
    searchParams.get("period") ?? undefined,
    searchParams.get("year") ?? undefined
  );

  function setPeriod(period: PeriodRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    params.delete("year");
    params.delete("from");
    params.delete("to");
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <label className="navbar-field">
      <span className="navbar-field-label">Time period</span>
      <select
        className="navbar-select"
        value={current}
        onChange={(e) => setPeriod(e.target.value as PeriodRange)}
        aria-label="Time period"
      >
        {PERIOD_RANGES.map((period) => (
          <option key={period} value={period}>
            {PERIOD_LABELS[period]}
          </option>
        ))}
      </select>
    </label>
  );
}
