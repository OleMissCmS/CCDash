import type { Concern } from "@/lib/types";

type ConcernsPanelProps = {
  concerns: Concern[];
};

export function ConcernsPanel({ concerns }: ConcernsPanelProps) {
  if (concerns.length === 0) {
    return (
      <div className="alert alert-success shadow-sm">
        <span>No active concerns based on current thresholds.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/70">
        Strategic concerns
      </h2>
      {concerns.map((c) => (
        <div
          key={c.id}
          className={`alert ${c.severity === "critical" ? "alert-error" : "alert-warning"} shadow-sm`}
        >
          <div>
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm">{c.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
