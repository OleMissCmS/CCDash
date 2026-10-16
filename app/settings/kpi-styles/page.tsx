import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AppTopNav } from "@/components/AppTopNav";
import { KPI_CARD_STYLES, getKpiCardComponent } from "@/components/kpi/registry";
import type { KpiCardRenderProps } from "@/components/kpi/types";
import { getStoplightStatus } from "@/lib/benchmarks";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/metrics";
import { canEditBenchmarks } from "@/lib/permissions";
import type { Metric } from "@/lib/types";
import { DEFAULT_FISCAL_YEAR } from "@/lib/types";

const SAMPLE_METRICS: Metric[] = [
  {
    id: "1",
    key: "total_in_person_avg",
    label: "Total In-Person Weekend",
    unit: "people",
    category: "attendance",
    requires_financial: false,
    sort_order: 1,
  },
  {
    id: "2",
    key: "total_giving",
    label: "Total Giving",
    unit: "currency",
    category: "stewardship",
    requires_financial: true,
    sort_order: 2,
  },
  {
    id: "3",
    key: "kids_pct_of_attendance",
    label: "Kids % of Attendance",
    unit: "percent",
    category: "attendance",
    requires_financial: false,
    sort_order: 3,
  },
];

function buildSamples(): KpiCardRenderProps[] {
  const scenarios: Array<{
    metric: Metric;
    value: number;
    benchmark: number;
    subtitle: string;
    higherIsBetter: boolean;
  }> = [
    {
      metric: SAMPLE_METRICS[0],
      value: 2185,
      benchmark: 2400,
      subtitle: `${DEFAULT_FISCAL_YEAR} · All campuses`,
      higherIsBetter: true,
    },
    {
      metric: SAMPLE_METRICS[1],
      value: 4_995_838,
      benchmark: 5_200_000,
      subtitle: `${DEFAULT_FISCAL_YEAR} · Church-wide`,
      higherIsBetter: true,
    },
    {
      metric: SAMPLE_METRICS[2],
      value: 18.4,
      benchmark: 22,
      subtitle: "Monthly average",
      higherIsBetter: true,
    },
  ];

  return scenarios.map((s) => {
    const stoplight = getStoplightStatus(s.value, s.benchmark, s.higherIsBetter);
    return {
      metric: s.metric,
      value: s.value,
      benchmark: s.benchmark,
      stoplight,
      benchmarkLabel: "FY26/27 target",
      subtitle: s.subtitle,
    };
  });
}

export default async function KpiStylesPreviewPage() {
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);
  if (!profile) redirect("/login");
  if (!canEditBenchmarks(profile)) redirect("/dashboard");

  const samples = buildSamples();

  return (
    <>
      <Navbar profile={profile} />
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8 space-y-10">
        <header className="space-y-4">
          <AppTopNav />
          <div className="space-y-2">
            <Link href="/dashboard" className="text-sm link link-hover">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              KPI card style comparison
            </h1>
            <p className="text-sm text-base-content/70 max-w-2xl">
              Seven plug-in styles using the same sample metrics. Pick one to
              swap in across the dashboard — all stay simple and scannable.
            </p>
          </div>
        </header>

        {KPI_CARD_STYLES.map((style) => {
          const Card = getKpiCardComponent(style.id);
          return (
            <section key={style.id} className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-lg font-semibold">{style.name}</h2>
                <code className="text-xs bg-base-200 px-2 py-0.5 rounded">
                  {style.id}
                </code>
                <p className="text-sm text-base-content/60 w-full sm:w-auto">
                  {style.tagline}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {samples.map((sample) => (
                  <Card key={`${style.id}-${sample.metric.key}`} {...sample} />
                ))}
              </div>
            </section>
          );
        })}

        <div className="alert alert-info">
          <span>
            Tell us which <code>style id</code> you prefer (e.g.{" "}
            <strong>stripe</strong> or <strong>bar</strong>) and we&apos;ll wire
            it as the dashboard default.
          </span>
        </div>
      </main>
    </>
  );
}
