"use client";

import { Suspense } from "react";
import type { ViewSection } from "@/lib/sections";
import { CategoryTabs } from "./CategoryTabs";
import { ComparisonToggle } from "./ComparisonToggle";

type DashboardToolbarProps = {
  allowedSections: ViewSection[];
};

export function DashboardToolbar({ allowedSections }: DashboardToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Suspense fallback={<div className="skeleton h-10 w-full max-w-xl" />}>
        <CategoryTabs allowedSections={allowedSections} />
      </Suspense>
      <Suspense fallback={<div className="skeleton h-10 w-48" />}>
        <ComparisonToggle />
      </Suspense>
    </div>
  );
}
