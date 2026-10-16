import type { ComponentType } from "react";
import type { KpiCardRenderProps, KpiCardStyleId, KpiCardStyleMeta } from "./types";
import {
  BarKpiCard,
  ClassicKpiCard,
  EdgyGaugeKpiCard,
  HeroKpiCard,
  SplitKpiCard,
  StatKpiCard,
  StripeKpiCard,
  TileKpiCard,
  SalesforceKpiCard,
} from "./variants";

export const KPI_CARD_STYLES: KpiCardStyleMeta[] = [
  {
    id: "salesforce",
    name: "Salesforce",
    tagline: "Lightning-style widget with large metric and benchmark footer.",
  },
  {
    id: "classic",
    name: "Classic",
    tagline: "Original rounded cards with semicircle gauge.",
  },
  {
    id: "edgy",
    name: "Edgy gauge",
    tagline: "Sharp corners, status stripe, bold type, angular benchmark arc.",
  },
  {
    id: "stripe",
    name: "Status stripe",
    tagline: "Left accent bar signals green / yellow / red at a glance.",
  },
  {
    id: "stat",
    name: "Stat block",
    tagline: "DaisyUI stat layout — compact figure + description.",
  },
  {
    id: "hero",
    name: "Hero number",
    tagline: "Oversized value; status as a small pill. Maximum scan speed.",
  },
  {
    id: "split",
    name: "Split compare",
    tagline: "Actual vs benchmark side-by-side for quick comparison.",
  },
  {
    id: "tile",
    name: "Tinted tile",
    tagline: "Soft status header band; value sits in a clean body.",
  },
  {
    id: "bar",
    name: "Progress bar",
    tagline: "Horizontal target bar — simpler than the semicircle gauge.",
  },
];

const COMPONENTS: Record<KpiCardStyleId, ComponentType<KpiCardRenderProps>> = {
  classic: ClassicKpiCard,
  edgy: EdgyGaugeKpiCard,
  stripe: StripeKpiCard,
  stat: StatKpiCard,
  hero: HeroKpiCard,
  split: SplitKpiCard,
  tile: TileKpiCard,
  bar: BarKpiCard,
  salesforce: SalesforceKpiCard,
};

export function getKpiCardComponent(
  styleId: KpiCardStyleId
): ComponentType<KpiCardRenderProps> {
  return COMPONENTS[styleId];
}

export const DEFAULT_KPI_CARD_STYLE: KpiCardStyleId = "edgy";
