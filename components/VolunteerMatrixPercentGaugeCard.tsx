import { BenchmarkGauge } from "@/components/BenchmarkGauge";
import { StoplightBadge } from "@/components/Stoplight";
import { STATUS_BORDER } from "@/components/kpi/shared";
import { getVolunteerMatrixPercentStatus } from "@/lib/volunteer-matrix";

type VolunteerMatrixPercentGaugeCardProps = {
  label: string;
  percent: number | null;
  subtitle?: string;
};

export function VolunteerMatrixPercentGaugeCard({
  label,
  percent,
  subtitle,
}: VolunteerMatrixPercentGaugeCardProps) {
  if (percent == null) {
    return (
      <div className="rounded-sm bg-base-100 border border-base-300 shadow-sm overflow-hidden ring-1 ring-base-content/5 border-l-[5px] border-l-base-300">
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-base-content/55">
            {label}
          </p>
        </div>
        <div className="px-4 pb-4 pt-2 flex justify-center items-center min-h-[88px]">
          <p className="text-2xl font-semibold text-base-content/30">—</p>
        </div>
        {subtitle && (
          <p className="px-4 pb-4 pt-0 text-[11px] text-base-content/50 text-center">
            {subtitle}
          </p>
        )}
      </div>
    );
  }

  const stoplight = getVolunteerMatrixPercentStatus(percent);
  const border = `border-l-[5px] ${STATUS_BORDER[stoplight.status]}`;

  return (
    <div
      className={`rounded-sm bg-base-100 border border-base-300 shadow-sm overflow-hidden ring-1 ring-base-content/5 ${border}`}
    >
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-base-content/55">
          {label}
        </p>
        <StoplightBadge status={stoplight.status} label={stoplight.label} />
      </div>

      <div className="px-4 pb-4 pt-2 flex justify-center">
        <BenchmarkGauge
          percentOfBenchmark={percent}
          status={stoplight.status}
          label={stoplight.label}
          variant="edgy"
          subcaption={null}
        />
      </div>

      {subtitle && (
        <p className="px-4 pb-4 pt-0 text-[11px] text-base-content/50 text-center">
          {subtitle}
        </p>
      )}
    </div>
  );
}
