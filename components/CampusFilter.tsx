"use client";

import type { Campus } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

type CampusFilterProps = {
  campuses: Campus[];
};

export function CampusFilter({ campuses }: CampusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("campus") ?? "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("campus");
    else params.set("campus", value);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <label className="navbar-field">
      <span className="navbar-field-label">Campus</span>
      <select
        className="navbar-select"
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Campus filter"
      >
        <option value="all">All campuses</option>
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
