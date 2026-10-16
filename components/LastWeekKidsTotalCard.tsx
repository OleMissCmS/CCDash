import { SfdcWidget } from "@/components/sfdc/SfdcWidget";
import { formatValue } from "@/lib/format";

type LastWeekKidsCampusTotal = {
  name: string;
  value: number;
};

type LastWeekKidsTotalCardProps = {
  total: number;
  subtitle: string;
  campuses?: LastWeekKidsCampusTotal[] | null;
};

export function LastWeekKidsTotalCard({
  total,
  subtitle,
  campuses = null,
}: LastWeekKidsTotalCardProps) {
  return (
    <SfdcWidget title="Last week kids attendance" className="sfdc-kpi-card">
      <p className="sfdc-kpi-value">{formatValue(total, "people")}</p>
      <p className="sfdc-kpi-meta">{subtitle}</p>
      {campuses && campuses.length > 0 && (
        <ul className="sfdc-kids-week-breakdown">
          {campuses.map((campus) => (
            <li key={campus.name}>
              <span>{campus.name}</span>
              <span>{formatValue(campus.value, "people")}</span>
            </li>
          ))}
        </ul>
      )}
    </SfdcWidget>
  );
}
