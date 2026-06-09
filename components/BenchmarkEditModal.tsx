"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { BenchmarkTarget, Campus, Metric } from "@/lib/types";
import { FISCAL_YEAR_OPTIONS } from "@/lib/types";

type BenchmarkEditModalProps = {
  benchmark: BenchmarkTarget | null;
  metrics: Metric[];
  campuses: Campus[];
  open: boolean;
  onClose: () => void;
};

export function BenchmarkEditModal({
  benchmark,
  metrics,
  campuses,
  open,
  onClose,
}: BenchmarkEditModalProps) {
  const router = useRouter();
  const [metricId, setMetricId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [stretchValue, setStretchValue] = useState("");
  const [label, setLabel] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (benchmark) {
      setMetricId(benchmark.metric_id);
      setCampusId(benchmark.campus_id ?? "");
      setTargetValue(String(benchmark.target_value));
      setStretchValue(
        benchmark.stretch_value != null ? String(benchmark.stretch_value) : ""
      );
      setLabel(benchmark.label ?? "");
      setFiscalYear(benchmark.fiscal_year);
      setError(null);
    }
  }, [benchmark]);

  const selectedMetric = metrics.find((m) => m.id === metricId);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!benchmark) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("benchmark_targets")
      .update({
        metric_id: metricId,
        campus_id: campusId || null,
        fiscal_year: fiscalYear,
        target_value: Number(targetValue),
        stretch_value: stretchValue ? Number(stretchValue) : null,
        label: label || null,
      })
      .eq("id", benchmark.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onClose();
    router.refresh();
  }

  if (!open || !benchmark) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-semibold text-lg">Edit benchmark</h3>
        <p className="text-sm text-base-content/70 mt-1 mb-4">
          Update this comparison point. Changes appear on the dashboard
          immediately.
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-4 w-full">
          <label className="form-control w-full">
            <span className="label-text">Metric</span>
            <select
              className="select select-bordered w-full"
              value={metricId}
              onChange={(e) => setMetricId(e.target.value)}
              required
            >
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control w-full">
            <span className="label-text">Campus (optional)</span>
            <select
              className="select select-bordered w-full"
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
            >
              <option value="">Church-wide</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control w-full">
            <span className="label-text">Fiscal year</span>
            <select
              className="select select-bordered w-full"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              required
            >
              {FISCAL_YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control w-full">
            <span className="label-text">
              Benchmark value
              {selectedMetric ? ` (${selectedMetric.unit})` : ""}
            </span>
            <input
              type="number"
              step="any"
              className="input input-bordered w-full"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
            />
          </label>

          <label className="form-control w-full">
            <span className="label-text">Stretch goal (optional)</span>
            <input
              type="number"
              step="any"
              className="input input-bordered w-full"
              value={stretchValue}
              onChange={(e) => setStretchValue(e.target.value)}
            />
          </label>

          <label className="form-control w-full">
            <span className="label-text">Label (optional)</span>
            <input
              type="text"
              className="input input-bordered w-full"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>

          {error && <div className="alert alert-error text-sm">{error}</div>}

          <div className="modal-action mt-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
    </dialog>
  );
}
