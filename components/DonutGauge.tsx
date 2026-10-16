import type { StoplightStatus } from "@/lib/benchmarks";

const GAUGE_COLORS: Record<StoplightStatus | "neutral", string> = {
  green: "#5a8f6a",
  yellow: "#f88c4a",
  red: "#f9423a",
  neutral: "#8a7355",
};

type DonutGaugeProps = {
  percent: number;
  status: StoplightStatus | "neutral";
  /** Optional second line inside the ring (e.g. "AS OF JULY 2026"). */
  caption?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
};

const SIZE_PX = {
  sm: 72,
  md: 88,
  lg: 112,
} as const;

export function DonutGauge({
  percent,
  status,
  caption = null,
  size = "md",
  className = "",
  ariaLabel,
}: DonutGaugeProps) {
  const px = SIZE_PX[size];
  const strokeWidth = size === "lg" ? 8 : size === "md" ? 7 : 6;
  const radius = (px - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillPercent = Math.min(100, Math.max(0, percent));
  const dashOffset = circumference * (1 - fillPercent / 100);
  const center = px / 2;

  return (
    <div
      className={`expense-donut ${className}`}
      style={{ width: px, height: px }}
      role="meter"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={
        ariaLabel ?? `${Math.round(percent)}% · ${status}`
      }
    >
      <svg
        viewBox={`0 0 ${px} ${px}`}
        width={px}
        height={px}
        aria-hidden
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-base-content/12"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={GAUGE_COLORS[status]}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="expense-donut__center">
        <span
          className={`expense-donut__value expense-donut__value--${size} tabular-nums`}
        >
          {Math.round(percent)}%
        </span>
        {caption ? (
          <span className="expense-donut__caption">{caption}</span>
        ) : null}
      </div>
    </div>
  );
}
