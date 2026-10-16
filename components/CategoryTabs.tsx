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
    <div role="tablist" className="sfdc-scoped-nav" aria-label="Dashboard views">
      {allowedSections.map((section) => (
        <button
          key={section}
          type="button"
          role="tab"
          aria-selected={current === section}
          className={`sfdc-scoped-nav__tab${
            current === section ? " sfdc-scoped-nav__tab--active" : ""
          }`}
          onClick={() => setSection(section)}
        >
          {VIEW_SECTION_LABELS[section]}
        </button>
      ))}
    </div>
  );
}
