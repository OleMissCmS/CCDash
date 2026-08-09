import { formatValue } from "@/lib/format";
import type { VitalSignReading } from "@/lib/vital-signs";

type VitalSignCardProps = {
  title: string;
  reading: VitalSignReading;
  unit?: string;
  subtitleItalic?: boolean;
};

export function VitalSignCard({
  title,
  reading,
  unit = "people",
  subtitleItalic = false,
}: VitalSignCardProps) {
  const isPlaceholder = !reading.hasData || reading.value == null;

  return (
    <div
      className={`card shadow-sm border ${
        isPlaceholder
          ? "bg-base-200/50 border-dashed border-base-300"
          : "bg-base-100 border-base-300"
      }`}
    >
      <div className="card-body p-4 gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
          {title}
        </p>
        {isPlaceholder ? (
          <p className="text-2xl font-semibold text-base-content/30">—</p>
        ) : (
          <p className="text-2xl font-semibold tabular-nums">
            {formatValue(reading.value!, unit)}
          </p>
        )}
        {reading.subtitle && (
          <p
            className={`text-xs text-base-content/60${
              subtitleItalic ? " italic" : ""
            }`}
          >
            {reading.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
