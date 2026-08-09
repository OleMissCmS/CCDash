import type { StoplightStatus } from "@/lib/benchmarks";

const GAUGE_COLORS: Record<StoplightStatus, string> = {
  green: "#5a8f6a",
  yellow: "#f88c4a",
  red: "#f9423a",
};

type BenchmarkGaugeProps = {
  percentOfBenchmark: number;
  status: StoplightStatus;
  label: string;
  variant?: "default" | "edgy";
  /** Override arc subcaption; omit for default, pass null to hide. */
  subcaption?: string | null;
};

export function BenchmarkGauge({
  percentOfBenchmark,
  status,
  label,
  variant = "default",
  subcaption,
}: BenchmarkGaugeProps) {
  const edgy = variant === "edgy";
  const fillPercent = Math.min(100, Math.max(0, percentOfBenchmark));
  const radius = edgy ? 40 : 42;
  const strokeWidth = edgy ? 10 : 8;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - fillPercent / 100);
  const arcPath = edgy
    ? "M 16 58 A 40 40 0 0 1 104 58"
    : "M 14 58 A 42 42 0 0 1 106 58";
  const arcSubcaption =
    subcaption === undefined
      ? edgy
        ? "Benchmark"
        : "of benchmark"
      : subcaption;

  return (
    <div
      className={`flex flex-col items-center gap-1 ${edgy ? "pt-2" : "pt-1"}`}
      role="meter"
      aria-valuenow={Math.round(fillPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${Math.round(percentOfBenchmark)}% of benchmark · ${label}`}
    >
      <svg
        viewBox="0 0 120 68"
        className={`w-full h-auto ${edgy ? "max-w-[10rem]" : "max-w-[9rem]"}`}
        aria-hidden
      >
        {edgy && (
          <>
            <line
              x1="16"
              y1="58"
              x2="16"
              y2="52"
              stroke="currentColor"
              strokeWidth={2}
              className="text-base-content/25"
            />
            <line
              x1="104"
              y1="58"
              x2="104"
              y2="52"
              stroke="currentColor"
              strokeWidth={2}
              className="text-base-content/25"
            />
          </>
        )}
        <path
          d={arcPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap={edgy ? "butt" : "round"}
          className={edgy ? "text-base-content/12" : "text-base-content/15"}
        />
        <path
          d={arcPath}
          fill="none"
          stroke={GAUGE_COLORS[status]}
          strokeWidth={strokeWidth}
          strokeLinecap={edgy ? "butt" : "round"}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-500"
        />
        <text
          x="60"
          y={edgy ? 48 : 50}
          textAnchor="middle"
          className="fill-base-content"
          style={{
            fontSize: edgy ? "20px" : "18px",
            fontWeight: edgy ? 700 : 600,
            letterSpacing: edgy ? "-0.02em" : undefined,
          }}
        >
          {Math.round(percentOfBenchmark)}%
        </text>
        {arcSubcaption != null && (
          <text
            x="60"
            y="64"
            textAnchor="middle"
            className="fill-base-content/60"
            style={{
              fontSize: "10px",
              fontWeight: edgy ? 600 : 400,
              letterSpacing: edgy ? "0.08em" : undefined,
              textTransform: edgy ? "uppercase" : undefined,
            }}
          >
            {arcSubcaption}
          </text>
        )}
      </svg>
      <span
        className={`text-xs ${edgy ? "font-semibold uppercase tracking-wide text-base-content/50" : "text-base-content/60"}`}
      >
        {label}
      </span>
    </div>
  );
}
