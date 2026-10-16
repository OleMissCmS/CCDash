import type { BenchmarkMinistryArea, BenchmarkTarget, Metric } from "./types";

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
  operations: "Financials",
};

export const VIEW_SECTION_DESCRIPTIONS: Record<ViewSection, string> = {
  "vital-signs":
    "Leadership vital signs for attendance, kids, serving, groups, and baptisms.",
  overview: "Church-wide ministry metrics and trends for the current fiscal year.",
  "adult-discipleship":
    "First-time guests, group participation, and baptism signups.",
  "next-gen": "Kids and student attendance across campuses.",
  "weekend-reach":
    "Weekend attendance, serving, and reach metrics by campus.",
  operations:
    "Budget, giving, expenses, and household stewardship.",
};

export type MetricLayoutGroup = {
  columns: 2 | 3;
  keys: readonly string[];
};

const OVERVIEW_METRIC_GROUPS: MetricLayoutGroup[] = [
  { columns: 2, keys: ["adult_worship_avg", "total_in_person_avg"] },
  { columns: 2, keys: ["kids_avg", "kids_pct_of_attendance"] },
  { columns: 2, keys: ["students_avg", "total_serving"] },
];

const SECTION_METRIC_LAYOUT: Partial<
  Record<ViewSection, readonly MetricLayoutGroup[]>
> = {
  overview: OVERVIEW_METRIC_GROUPS,
  "weekend-reach": [
    { columns: 2, keys: ["adult_worship_avg", "total_in_person_avg"] },
  ],
  "next-gen": [{ columns: 2, keys: ["kids_avg", "kids_pct_of_attendance"] }],
  operations: [
    { columns: 2, keys: ["giving_previous_month", "giving_households"] },
  ],
};

export function buildMetricLayoutGroups(
  section: ViewSection,
  metrics: Metric[]
): MetricLayoutGroup[] {
  const preset = SECTION_METRIC_LAYOUT[section];
  const metricKeys = new Set(metrics.map((metric) => metric.key));

  if (preset) {
    const groups: MetricLayoutGroup[] = preset
      .map((group) => ({
        columns: group.columns,
        keys: group.keys.filter((key) => metricKeys.has(key)),
      }))
      .filter((group) => group.keys.length > 0);

    const assigned = new Set(groups.flatMap((group) => group.keys));
    const remaining = metrics
      .map((metric) => metric.key)
      .filter((key) => !assigned.has(key));

    if (remaining.length > 0) {
      groups.push({ columns: 2, keys: remaining });
    }

    return groups;
  }

  return [{ columns: 2, keys: metrics.map((metric) => metric.key) }];
}

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

export const BENCHMARK_MINISTRY_AREAS: readonly BenchmarkMinistryArea[] = [
  "weekend-reach",
  "adult-discipleship",
  "next-gen",
];

export function defaultMinistryAreaForMetric(
  metricKey: string | undefined
): BenchmarkMinistryArea | null {
  if (!metricKey) return null;
  return (
    BENCHMARK_MINISTRY_AREAS.find((area) => {
      const keys = SECTION_METRIC_KEYS[area];
      return keys !== "all" && keys.includes(metricKey);
    }) ?? null
  );
}

export function benchmarkTargetsForSection(
  targets: BenchmarkTarget[],
  section: ViewSection,
  canViewFinancial: boolean
): BenchmarkTarget[] {
  const visible = canViewFinancial
    ? targets
    : targets.filter((target) => !target.metric?.requires_financial);

  const keys = SECTION_METRIC_KEYS[section];
  if (keys === "all") return visible;

  return visible.filter((target) => {
    if (target.ministry_area) return target.ministry_area === section;
    return target.metric != null && keys.includes(target.metric.key);
  });
}

export function sectionShowsAttendanceTrend(section: ViewSection): boolean {
  return section === "overview" || section === "weekend-reach";
}

export function sectionShowsKidsAttendanceCharts(section: ViewSection): boolean {
  return section === "overview" || section === "next-gen";
}

export function sectionShowsKidsCalendarYearChart(section: ViewSection): boolean {
  return section === "next-gen";
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
