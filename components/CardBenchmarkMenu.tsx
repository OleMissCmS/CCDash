"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type CardBenchmarkEdit = {
  metricId: string;
  metricLabel: string;
  metricUnit: string;
  campusId: string | null;
  campusName: string;
  fiscalYear: string;
  ministryArea: string | null;
  benchmark: {
    id: string;
    targetValue: number;
    stretchValue: number | null;
    label: string | null;
  } | null;
};

export function CardBenchmarkMenu({
  title,
  edit = null,
}: {
  title: string;
  edit?: CardBenchmarkEdit | null;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [targetValue, setTargetValue] = useState("");
  const [stretchValue, setStretchValue] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function openEditor() {
    if (!edit) return;
    setMenuOpen(false);
    setTargetValue(
      edit.benchmark ? String(edit.benchmark.targetValue) : ""
    );
    setStretchValue(
      edit.benchmark?.stretchValue != null
        ? String(edit.benchmark.stretchValue)
        : ""
    );
    setLabel(edit.benchmark?.label ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!edit) return;
    setLoading(true);
    setError(null);

    const payload = {
      metric_id: edit.metricId,
      campus_id: edit.campusId,
      fiscal_year: edit.fiscalYear,
      ministry_area: edit.ministryArea,
      target_value: Number(targetValue),
      stretch_value: stretchValue ? Number(stretchValue) : null,
      label: label || null,
    };

    const supabase = createClient();
    const result = edit.benchmark
      ? await supabase
          .from("benchmark_targets")
          .update(payload)
          .eq("id", edit.benchmark.id)
      : await supabase.from("benchmark_targets").insert(payload);

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setEditing(false);
    router.refresh();
  }

  const unitLabel =
    edit?.metricUnit === "percent"
      ? "percent"
      : edit?.metricUnit === "currency"
        ? "dollars"
        : "people";

  return (
    <>
      <div className="sfdc-card-menu" ref={rootRef}>
        <button
          type="button"
          className="sfdc-card-menu__button"
          aria-label={`Options for ${title}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <circle cx="7" cy="2.75" r="1.15" fill="currentColor" />
            <circle cx="7" cy="7" r="1.15" fill="currentColor" />
            <circle cx="7" cy="11.25" r="1.15" fill="currentColor" />
          </svg>
        </button>
        {menuOpen && edit && (
          <div className="sfdc-card-menu__panel" role="menu">
            <button type="button" role="menuitem" onClick={openEditor}>
              Edit benchmark
            </button>
          </div>
        )}
      </div>

      {edit && editing && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-semibold text-lg">Edit benchmark</h3>
            <p className="text-sm text-base-content/70 mt-1 mb-4">
              {edit.metricLabel} · {edit.campusName} · {edit.fiscalYear}
            </p>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <label className="form-control w-full">
                <span className="label-text">Benchmark value ({unitLabel})</span>
                <input
                  type="number"
                  step="any"
                  className="input input-bordered w-full"
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.target.value)}
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
                  onChange={(event) => setStretchValue(event.target.value)}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text">Label (optional)</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </label>
              {error && <div className="alert alert-error text-sm">{error}</div>}
              <div className="modal-action mt-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditing(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Saving…" : "Save benchmark"}
                </button>
              </div>
            </form>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label="Close"
            onClick={() => setEditing(false)}
          />
        </dialog>
      )}
    </>
  );
}
