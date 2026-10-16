import { formatValue } from "@/lib/format";
import { SfdcWidget } from "@/components/sfdc/SfdcWidget";
import type { VitalSignReading } from "@/lib/vital-signs";

type VitalSignCardProps = {
  title: string;
  reading: VitalSignReading;
  unit?: string;
  subtitleItalic?: boolean;
  className?: string;
};

export function VitalSignCard({
  title,
  reading,
  unit = "people",
  subtitleItalic = false,
  className = "",
}: VitalSignCardProps) {
  const isPlaceholder = !reading.hasData || reading.value == null;

  return (
    <SfdcWidget
      title={title}
      placeholder={isPlaceholder}
      className={className}
    >
      {isPlaceholder ? (
        <p className="sfdc-metric-value sfdc-metric-value--muted">—</p>
      ) : (
        <p className="sfdc-metric-value">
          {reading.displayValue ?? formatValue(reading.value!, unit)}
        </p>
      )}
      {reading.subtitle && (
        <p
          className={`sfdc-metric-subtitle${subtitleItalic ? " italic" : ""}`}
        >
          {reading.subtitle}
        </p>
      )}
    </SfdcWidget>
  );
}
