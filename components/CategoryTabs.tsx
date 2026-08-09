"use client";

import {
  parseViewSection,
  VIEW_SECTION_LABELS,
  type ViewSection,
} from "@/lib/sections";
import { useRouter, useSearchParams } from "next/navigation";

type CategoryTabsProps = {
  allowedSections: ViewSection[];
};

export function CategoryTabs({ allowedSections }: CategoryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = parseViewSection(
    searchParams.get("section") ?? undefined,
    allowedSections[0] ?? "overview"
  );

  function setSection(section: ViewSection) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div role="tablist" className="tabs tabs-boxed bg-base-200 p-1 flex-wrap">
      {allowedSections.map((section) => (
        <button
          key={section}
          type="button"
          role="tab"
          className={`tab ${current === section ? "tab-active" : ""}`}
          onClick={() => setSection(section)}
        >
          {VIEW_SECTION_LABELS[section]}
        </button>
      ))}
    </div>
  );
}
