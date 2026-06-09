"use client";

import { Suspense } from "react";
import { CategoryTabs } from "./CategoryTabs";
import { ComparisonToggle } from "./ComparisonToggle";

type DashboardToolbarProps = {
  canViewStewardship: boolean;
};

export function DashboardToolbar({ canViewStewardship }: DashboardToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Suspense fallback={<div className="skeleton h-10 w-full max-w-xl" />}>
        <CategoryTabs canViewStewardship={canViewStewardship} />
      </Suspense>
      <Suspense fallback={<div className="skeleton h-10 w-48" />}>
        <ComparisonToggle />
      </Suspense>
    </div>
  );
}
