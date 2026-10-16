import type { StoplightStatus } from "@/lib/benchmarks";
import { expensePaceTextClass } from "@/lib/expense-budget-pace";

type ExpensePaceBarProps = {
  percent: number | null;
  status: StoplightStatus;
};

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function ExpensePaceBar({ percent, status }: ExpensePaceBarProps) {
  if (percent == null) {
    return <span className="text-base-content/40">—</span>;
  }

  const fill = clampPercent(percent);

  return (
    <div className="expense-pace-bar">
      <div className="expense-pace-bar__track" aria-hidden>
        <div
          className={`expense-pace-bar__fill expense-pace-bar__fill--${status}`}
          style={{ width: `${fill}%` }}
        />
      </div>
      <span
        className={`expense-pace-bar__label tabular-nums ${expensePaceTextClass(status)}`}
      >
        {percent.toFixed(0)}%
      </span>
    </div>
  );
}
