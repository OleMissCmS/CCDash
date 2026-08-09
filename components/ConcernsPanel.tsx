"use client";

import { useState } from "react";
import type { Concern } from "@/lib/types";

type ConcernsPanelProps = {
  concerns: Concern[];
};

function panelTone(concerns: Concern[]): string {
  if (concerns.length === 0) return "alert-success";
  if (concerns.some((c) => c.severity === "critical")) return "alert-error";
  return "alert-warning";
}

function summaryText(concerns: Concern[]): string {
  if (concerns.length === 0) {
    return "No active strategic concerns";
  }
  if (concerns.length === 1) {
    return "1 strategic concern needs attention";
  }
  return `${concerns.length} strategic concerns need attention`;
}

export function ConcernsPanel({ concerns }: ConcernsPanelProps) {
  const [open, setOpen] = useState(false);
  const tone = panelTone(concerns);

  return (
    <section
      className={`alert ${tone} shadow-sm flex-col items-stretch gap-0 p-0 overflow-hidden`}
      aria-label="Strategic concerns"
    >
      <div className="flex w-full items-center gap-2 p-4">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="strategic-concerns-panel"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-base-100/30 text-base font-semibold">
            {concerns.length === 0 ? "✓" : concerns.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Strategic concerns</span>
            <span className="block truncate text-sm opacity-90">
              {open
                ? concerns.length === 0
                  ? "All clear based on current thresholds"
                  : "Review items below"
                : summaryText(concerns)}
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide opacity-80">
            {open ? "Hide" : "View"}
          </span>
        </button>
        {open && (
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle shrink-0"
            onClick={() => setOpen(false)}
            aria-label="Close strategic concerns"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div
          id="strategic-concerns-panel"
          className="space-y-2 border-t border-base-content/10 px-4 pb-4 pt-3"
        >
          {concerns.length === 0 ? (
            <p className="text-sm">
              No active concerns based on current thresholds.
            </p>
          ) : (
            concerns.map((concern) => (
              <div
                key={concern.id}
                className={`rounded-box border px-3 py-2 ${
                  concern.severity === "critical"
                    ? "border-error/30 bg-error/10"
                    : "border-warning/30 bg-warning/10"
                }`}
              >
                <h3 className="font-semibold text-sm">{concern.title}</h3>
                <p className="text-sm opacity-90">{concern.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
