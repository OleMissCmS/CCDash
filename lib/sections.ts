import type { Metric } from "./types";

export type ViewSection =
  | "vital-signs"
  | "overview"
  | "adult-discipleship"
  | "next-gen"
  | "weekend-reach"
  | "operations";

export const VIEW_SECTIONS: ViewSection[] = [
  "vital-signs",
  "overview",
  "adult-discipleship",
  "next-gen",
  "weekend-reach",
  "operations",
];

export const VIEW_SECTION_LABELS: Record<ViewSection, string> = {
  "vital-signs": "Vital Signs",
  overview: "Overview",
  "adult-discipleship": "Adult Discipleship",
  "next-gen": "Next Gen",
  "weekend-reach": "Weekend & Reach",
  operations: "Operations",
};

const SECTION_METRIC_KEYS: Record<
  ViewSection,
  readonly string[] | "all"
> = {
  "vital-signs": [],
  overview: "all",
  "adult-discipleship": [
    "first_time_guests",
    "group_participation_rate",
    "baptisms",
  ],
  "next-gen": ["kids_avg", "students_avg", "kids_pct_of_attendance"],
  "weekend-reach": [
    "total_in_person_avg",
    "adult_worship_avg",
    "total_serving",
  ],
  operations: [
    "total_giving",
    "giving_households",
    "general_fund_expenses",
    "retention_1st_to_2nd",
    "new_giving_households",
    "giving_previous_month",
  ],
};

const LEGACY_SECTION_MAP: Record<string, ViewSection> = {
  attendance: "weekend-reach",
  serving: "weekend-reach",
  groups: "adult-discipleship",
  engagement: "adult-discipleship",
  stewardship: "operations",
};

export function parseViewSection(
  raw: string | undefined,
  defaultSection: ViewSection = "overview"
): ViewSection {
  if (!raw) return defaultSection;
  if (raw in LEGACY_SECTION_MAP) return LEGACY_SECTION_MAP[raw];
  if (VIEW_SECTIONS.includes(raw as ViewSection)) return raw as ViewSection;
  return defaultSection;
}

const SHEET_PANEL_METRIC_KEYS = new Set(["baptisms", "first_time_guests"]);

export function filterMetricsForSection(
  metrics: Metric[],
  section: ViewSection,
  canViewFinancial: boolean
): Metric[] {
  const keys = SECTION_METRIC_KEYS[section];
  let filtered =
    keys === "all"
      ? metrics.filter((metric) => !SHEET_PANEL_METRIC_KEYS.has(metric.key))
      : metrics.filter((m) => keys.includes(m.key));

  if (!canViewFinancial) {
    filtered = filtered.filter((m) => !m.requires_financial);
  }

  return [...filtered].sort((a, b) => a.sort_order - b.sort_order);
}

export function metricKeysForSection(
  section: ViewSection,
  canViewFinancial: boolean
): string[] | null {
  const keys = SECTION_METRIC_KEYS[section];
  if (keys === "all") return null;
  if (!canViewFinancial && section === "operations") return [];
  return [...keys];
}

export function sectionShowsAttendanceTrend(section: ViewSection): boolean {
  return section === "overview" || section === "weekend-reach";
}

export function sectionShowsGivingTrend(section: ViewSection): boolean {
  return section === "operations";
}

export function sectionUsesBaptismsYearMode(section: ViewSection): boolean {
  return section === "adult-discipleship";
}

export function sectionShowsBaptismsPanel(section: ViewSection): boolean {
  return section === "adult-discipleship";
}

export function sectionShowsFirstTimeGuestsPanel(section: ViewSection): boolean {
  return section === "adult-discipleship";
}

export function isOperationsSection(section: ViewSection): boolean {
  return section === "operations";
}

export function isVitalSignsSection(section: ViewSection): boolean {
  return section === "vital-signs";
}
