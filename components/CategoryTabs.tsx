"use client";

import type { MetricCategory } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES: MetricCategory[] = [
  "attendance",
  "serving",
  "groups",
  "engagement",
  "stewardship",
];

type CategoryTabsProps = {
  canViewStewardship: boolean;
};

export function CategoryTabs({ canViewStewardship }: CategoryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current =
    (searchParams.get("section") as MetricCategory) ?? "attendance";

  function setSection(section: MetricCategory) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div role="tablist" className="tabs tabs-boxed bg-base-200 p-1 flex-wrap">
      {CATEGORIES.filter(
        (c) => c !== "stewardship" || canViewStewardship
      ).map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          className={`tab ${current === category ? "tab-active" : ""}`}
          onClick={() => setSection(category)}
        >
          {CATEGORY_LABELS[category]}
        </button>
      ))}
    </div>
  );
}
