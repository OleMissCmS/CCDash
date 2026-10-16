"use client";

import type { CompareMode } from "@/lib/comparison";
import { useRouter, useSearchParams } from "next/navigation";

const MODES: { value: CompareMode; label: string }[] = [
  { value: "off", label: "No comparison" },
  { value: "cross-campus", label: "Compare campuses" },
  { value: "vs-church", label: "Campus vs church-wide" },
];

export function ComparisonToggle({
  allowedModes,
}: {
  allowedModes?: CompareMode[];
}) {
  const modes = allowedModes
    ? MODES.filter((mode) => allowedModes.includes(mode.value))
    : MODES;
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
    <label className="sfdc-field">
      <span className="sfdc-field__label">Compare</span>
      <select
        id="compare-mode"
        className="sfdc-select"
        value={current}
        onChange={(e) => setCompare(e.target.value as CompareMode)}
        aria-label="Comparison mode"
      >
        {modes.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
    </label>
  );
}
