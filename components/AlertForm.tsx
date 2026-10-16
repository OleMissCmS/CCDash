"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Campus, Metric } from "@/lib/types";

type AlertFormProps = {
  metrics: Metric[];
  campuses: Campus[];
};

export function AlertForm({ metrics, campuses }: AlertFormProps) {
  const router = useRouter();
  const [metricId, setMetricId] = useState(metrics[0]?.id ?? "");
  const [campusId, setCampusId] = useState("");
  const [dropPercent, setDropPercent] = useState(10);
  const [monthsWindow, setMonthsWindow] = useState(3);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("alert_thresholds").insert({
      metric_id: metricId,
      campus_id: campusId || null,
      drop_percent: dropPercent,
      months_window: monthsWindow,
      label: label || null,
      is_enabled: true,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Alert threshold added.");
      setLabel("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <h2 className="card-title text-lg">Add alert threshold</h2>

        <label className="form-control">
          <span className="label-text">Metric</span>
          <select
            className="select select-bordered"
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

        <label className="form-control">
          <span className="label-text">Campus (optional)</span>
          <select
            className="select select-bordered"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Threshold (%)</span>
            <input
              type="number"
              className="input input-bordered"
              value={dropPercent}
              min={1}
              max={100}
              onChange={(e) => setDropPercent(Number(e.target.value))}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text">Over months</span>
            <input
              type="number"
              className="input input-bordered"
              value={monthsWindow}
              min={1}
              max={24}
              onChange={(e) => setMonthsWindow(Number(e.target.value))}
              required
            />
          </label>
        </div>

        <label className="form-control">
          <span className="label-text">Label (optional)</span>
          <input
            type="text"
            className="input input-bordered"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Attendance drop at Alma"
          />
        </label>

        {error && <div className="alert alert-error text-sm">{error}</div>}
        {message && <div className="alert alert-success text-sm">{message}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Add threshold"}
        </button>
      </div>
    </form>
  );
}
