"use client";

import { useState } from "react";
import { formatValue } from "@/lib/format";
import { VIEW_SECTION_LABELS } from "@/lib/sections";
import type { BenchmarkTarget, Campus, Metric } from "@/lib/types";
import { BenchmarkEditModal } from "./BenchmarkEditModal";

type BenchmarkListProps = {
  benchmarks: BenchmarkTarget[];
  metrics: Metric[];
  campuses: Campus[];
};

export function BenchmarkList({
  benchmarks,
  metrics,
  campuses,
}: BenchmarkListProps) {
  const [selected, setSelected] = useState<BenchmarkTarget | null>(null);

  function openEdit(benchmark: BenchmarkTarget) {
    setSelected(benchmark);
  }

  function closeEdit() {
    setSelected(null);
  }

  if (benchmarks.length === 0) {
    return (
      <p className="text-sm text-base-content/60">
        No benchmarks configured yet.
      </p>
    );
  }

  return (
    <>
      <p className="text-sm text-base-content/60 mb-3">
        Click a row to edit.
      </p>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Area</th>
              <th>Campus</th>
              <th>Benchmark</th>
              <th>Stretch</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((b) => (
              <tr
                key={b.id}
                className="hover:bg-base-200 cursor-pointer transition-colors"
                onClick={() => openEdit(b)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEdit(b);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Edit benchmark for ${b.metric?.label ?? "metric"}`}
              >
                <td>{b.metric?.label}</td>
                <td>
                  {b.ministry_area ? VIEW_SECTION_LABELS[b.ministry_area] : "—"}
                </td>
                <td>{b.campus?.name ?? "Church-wide"}</td>
                <td>
                  {b.metric
                    ? formatValue(b.target_value, b.metric.unit)
                    : b.target_value}
                </td>
                <td>
                  {b.stretch_value != null && b.metric
                    ? formatValue(b.stretch_value, b.metric.unit)
                    : "—"}
                </td>
                <td className="text-base-content/70">{b.label ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BenchmarkEditModal
        benchmark={selected}
        metrics={metrics}
        campuses={campuses}
        open={selected !== null}
        onClose={closeEdit}
      />
    </>
  );
}
