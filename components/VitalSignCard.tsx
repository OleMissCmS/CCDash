import type { CardBenchmarkEdit } from "@/components/CardBenchmarkMenu";
import { formatValue } from "@/lib/format";
import { SfdcWidget } from "@/components/sfdc/SfdcWidget";
import type { VitalSignPriorMonth, VitalSignReading } from "@/lib/vital-signs";

function roundedForDisplay(value: number, unit: string): number {
  if (unit === "percent") return Math.round(value * 10) / 10;
  return Math.round(value);
}

function PriorMonthDelta({
  priorMonth,
  unit,
}: {
  priorMonth: VitalSignPriorMonth;
  unit: string;
}) {
  const prior = roundedForDisplay(priorMonth.value, unit);
  const current = roundedForDisplay(priorMonth.value + priorMonth.difference, unit);
  const difference = current - prior;
  const direction = difference > 0 ? "up" : difference < 0 ? "down" : "flat";
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "";

  return (
    <p className="sfdc-vital-sign-delta">
      <span className="sfdc-vital-sign-delta__prior">
        {priorMonth.label} · {formatValue(prior, unit)}
      </span>
      <span className={`sfdc-vital-sign-delta__change sfdc-vital-sign-delta__change--${direction}`}>
        {arrow}
        {arrow ? " " : ""}
        {formatValue(Math.abs(difference), unit)}
      </span>
    </p>
  );
}

type VitalSignCardProps = {
  title: string;
  reading: VitalSignReading;
  unit?: string;
  subtitleItalic?: boolean;
  className?: string;
  benchmarkEdit?: CardBenchmarkEdit | null;
};

export function VitalSignCard({
  title,
  reading,
  unit = "people",
  subtitleItalic = false,
  className = "",
  benchmarkEdit = null,
}: VitalSignCardProps) {
  const isPlaceholder = !reading.hasData || reading.value == null;

  return (
    <SfdcWidget
      title={title}
      placeholder={isPlaceholder}
      className={className}
      benchmarkEdit={benchmarkEdit}
    >
      {isPlaceholder ? (
        <p className="sfdc-metric-value sfdc-metric-value--muted">—</p>
      ) : (
        <p className="sfdc-metric-value">
          {reading.displayValue ?? formatValue(reading.value!, unit)}
        </p>
      )}
      {(reading.subtitle || reading.priorMonth) && (
        <div className="sfdc-vital-sign-card__meta">
          {reading.subtitle && (
            <p
              className={`sfdc-metric-subtitle${subtitleItalic ? " italic" : ""}`}
            >
              {reading.subtitle}
            </p>
          )}
          {reading.priorMonth && (
            <PriorMonthDelta priorMonth={reading.priorMonth} unit={unit} />
          )}
        </div>
      )}
    </SfdcWidget>
  );
}
