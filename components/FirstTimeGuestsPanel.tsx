import type {
  FirstTimeGuestsSummary,
  GuestCampusSlug,
} from "@/lib/google-sheets-first-time-guests";

const CAMPUS_ORDER: GuestCampusSlug[] = [
  "mount-pleasant",
  "alma",
  "st-johns",
];

const CAMPUS_LABELS: Record<GuestCampusSlug, string> = {
  "mount-pleasant": "Mt. Pleasant",
  alma: "Alma",
  "st-johns": "St. Johns",
};

type FirstTimeGuestsPanelProps = {
  data: FirstTimeGuestsSummary;
};

export function FirstTimeGuestsPanel({ data }: FirstTimeGuestsPanelProps) {
  const sourceNote =
    data.source === "google_sheets"
      ? "Live from first-time guests sheet"
      : "Sample data — share the sheet publicly to load live counts";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
              Fiscal Year · {data.currentFiscalYearLabel}
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {data.currentFiscalYearTotal.toLocaleString()}
            </p>
            <p className="text-xs text-base-content/60">
              Weekly first-time guest counts · May–Apr
            </p>
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
              Fiscal Year · {data.fiscalYearLabel}
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {data.fiscalYearTotal.toLocaleString()}
            </p>
            <p className="text-xs text-base-content/60">Prior fiscal year window</p>
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="card-body p-4 gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
              Calendar Year · {data.calendarYear}
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {data.calendarYearTotal.toLocaleString()}
            </p>
            <p className="text-xs text-base-content/60">First-time guests</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-base-content/60">
              <th>Campus</th>
              <th className="text-right">Guests</th>
            </tr>
          </thead>
          <tbody>
            {CAMPUS_ORDER.map((slug) => (
              <tr key={slug}>
                <td className="font-medium">{CAMPUS_LABELS[slug]}</td>
                <td className="text-right tabular-nums">
                  {data.byCampus[slug].toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td>Church-wide</td>
              <td className="text-right tabular-nums">
                {data.guests.length.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-base-content/50">{sourceNote}</p>

      {data.warnings.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-base-content/70 space-y-1">
          {data.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </div>
  );
}
