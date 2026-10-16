import type { StoplightStatus } from "@/lib/benchmarks";

const STATUS_STYLES: Record<
  StoplightStatus,
  { dot: string; badge: string; text: string }
> = {
  green: {
    dot: "bg-white",
    badge: "border-0 bg-[#5a8f6a] text-white",
    text: "text-[#5a8f6a]",
  },
  yellow: {
    dot: "bg-warning",
    badge: "badge-warning",
    text: "text-warning",
  },
  red: {
    dot: "bg-error",
    badge: "badge-error",
    text: "text-error",
  },
};

type StoplightProps = {
  status: StoplightStatus;
  label?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
};

export function Stoplight({
  status,
  label,
  size = "md",
  showLabel = false,
}: StoplightProps) {
  const styles = STATUS_STYLES[status];
  const dotSize = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";

  return (
    <span className="inline-flex items-center gap-2" title={label}>
      <span
        className={`inline-block rounded-full ${dotSize} ${styles.dot} ring-2 ring-base-100`}
        aria-hidden
      />
      {showLabel && label && (
        <span className={`text-xs font-medium ${styles.text}`}>{label}</span>
      )}
    </span>
  );
}

type StoplightBadgeProps = {
  status: StoplightStatus;
  label: string;
};

export function StoplightBadge({ status, label }: StoplightBadgeProps) {
  const styles = STATUS_STYLES[status];
  return (
    <span className={`badge badge-sm ${styles.badge} gap-1.5`}>
      <Stoplight status={status} size="sm" />
      {label}
    </span>
  );
}
