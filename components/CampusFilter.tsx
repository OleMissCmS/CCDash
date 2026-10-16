"use client";

import type { Campus } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

type CampusFilterProps = {
  campuses: Campus[];
  basePath?: string;
  allowAllCampuses?: boolean;
};

export function CampusFilter({
  campuses,
  basePath = "/dashboard",
  allowAllCampuses = true,
}: CampusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("campus") ?? "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("campus");
    else params.set("campus", value);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <label className="sfdc-field">
      <span className="sfdc-field__label">Campus</span>
      <select
        className="sfdc-select"
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Campus filter"
        disabled={(allowAllCampuses ? 1 : 0) + campuses.length <= 1}
      >
        {allowAllCampuses && <option value="all">All campuses</option>}
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
