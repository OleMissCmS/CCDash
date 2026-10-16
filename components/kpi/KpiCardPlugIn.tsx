import { DEFAULT_KPI_CARD_STYLE, getKpiCardComponent } from "./registry";
import type { KpiCardRenderProps, KpiCardStyleId } from "./types";

type KpiCardPlugInProps = KpiCardRenderProps & {
  style?: KpiCardStyleId;
};

export function KpiCardPlugIn({
  style = DEFAULT_KPI_CARD_STYLE,
  ...props
}: KpiCardPlugInProps) {
  const Component = getKpiCardComponent(style);
  return <Component {...props} />;
}
