"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Campus, Metric } from "@/lib/types";
import { FISCAL_YEAR_OPTIONS, TARGET_FISCAL_YEAR } from "@/lib/types";

type BenchmarkFormProps = {
  metrics: Metric[];
  campuses: Campus[];
};

export function BenchmarkForm({ metrics, campuses }: BenchmarkFormProps) {
  const router = useRouter();
  const [metricId, setMetricId] = useState(metrics[0]?.id ?? "");
  const [campusId, setCampusId] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [stretchValue, setStretchValue] = useState("");
  const [label, setLabel] = useState("");
  const [fiscalYear, setFiscalYear] = useState(TARGET_FISCAL_YEAR);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("benchmark_targets")
      .insert({
        metric_id: metricId,
        campus_id: campusId || null,
        fiscal_year: fiscalYear,
        target_value: Number(targetValue),
        stretch_value: stretchValue ? Number(stretchValue) : null,
        label: label || null,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Benchmark added.");
      setTargetValue("");
      setStretchValue("");
      setLabel("");
      router.refresh();
    }
    setLoading(false);
  }

  const selectedMetric = metrics.find((m) => m.id === metricId);

  return (
    <form
      onSubmit={handleSubmit}
      className="card bg-base-100 border border-base-300 shadow-sm max-w-md"
    >
      <div className="card-body gap-4">
        <h2 className="card-title text-lg">Add benchmark</h2>
        <p className="text-sm text-base-content/70">
          Benchmarks appear on the dashboard with a stoplight: green (on track),
          yellow (needs attention), red (below benchmark).
        </p>

        <div className="flex flex-col gap-4 w-full">
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
              placeholder={
                selectedMetric?.unit === "percent" ? "e.g. 20" : "e.g. 1500"
              }
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
              placeholder="e.g. Kids % of total attendance"
            />
          </label>
        </div>

        {error && <div className="alert alert-error text-sm">{error}</div>}
        {message && <div className="alert alert-success text-sm">{message}</div>}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Saving…" : "Add benchmark"}
        </button>
      </div>
    </form>
  );
}
