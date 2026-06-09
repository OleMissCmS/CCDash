"use client";

import type { CompareMode } from "@/lib/comparison";
import { useRouter, useSearchParams } from "next/navigation";

const MODES: { value: CompareMode; label: string }[] = [
  { value: "off", label: "No comparison" },
  { value: "cross-campus", label: "Compare campuses" },
  { value: "vs-church", label: "Campus vs church-wide" },
];

export function ComparisonToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("compare") as CompareMode) ?? "off";

  function setCompare(mode: CompareMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "off") params.delete("compare");
    else params.set("compare", mode);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <label htmlFor="compare-mode" className="text-sm text-base-content/70 hidden sm:inline">
        Compare
      </label>
      <select
        id="compare-mode"
        className="select select-bordered select-sm min-w-[11rem]"
        value={current}
        onChange={(e) => setCompare(e.target.value as CompareMode)}
        aria-label="Comparison mode"
      >
        {MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
    </div>
  );
}
