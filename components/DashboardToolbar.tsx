"use client";

import { Suspense } from "react";
import type { CompareMode } from "@/lib/comparison";
import type { ViewSection } from "@/lib/sections";
import { CategoryTabs } from "./CategoryTabs";
import { ComparisonToggle } from "./ComparisonToggle";

type DashboardToolbarProps = {
  allowedSections: ViewSection[];
  compareModes?: CompareMode[];
};

export function DashboardToolbar({
  allowedSections,
  compareModes,
}: DashboardToolbarProps) {
  const showComparison = !compareModes || compareModes.length > 1;
  return (
    <div className="sfdc-toolbar">
      <Suspense fallback={<div className="skeleton h-10 w-full max-w-xl" />}>
        <CategoryTabs allowedSections={allowedSections} />
      </Suspense>
      {showComparison && (
        <Suspense fallback={<div className="skeleton h-10 w-48" />}>
          <ComparisonToggle allowedModes={compareModes} />
        </Suspense>
      )}
    </div>
  );
}
