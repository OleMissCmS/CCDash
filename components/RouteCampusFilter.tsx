"use client";

import type { Campus } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

type RouteCampusFilterProps = {
  campuses: Campus[];
  basePath: string;
};

export function RouteCampusFilter({
  campuses,
  basePath,
}: RouteCampusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("campus") ?? "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("campus");
    else params.set("campus", value);
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  return (
    <label className="navbar-field">
      <span className="navbar-field-label">Campus</span>
      <select
        className="navbar-select"
        value={current}
        onChange={(event) => handleChange(event.target.value)}
        aria-label="Campus filter"
      >
        <option value="all">All campuses</option>
        {campuses.map((campus) => (
          <option key={campus.id} value={campus.id}>
            {campus.name}
          </option>
        ))}
      </select>
    </label>
  );
}
