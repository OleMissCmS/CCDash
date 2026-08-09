"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Campus } from "@/lib/types";

type CampusFilterChmsProps = {
  campuses: Campus[];
};

export function CampusFilterChms({ campuses }: CampusFilterChmsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("campus") ?? "";

  function setCampus(campusId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (campusId) params.set("campus", campusId);
    else params.delete("campus");
    router.push(`?${params.toString()}`);
  }

  return (
    <select
      className="select select-bordered select-sm"
      value={current}
      onChange={(e) => setCampus(e.target.value)}
      aria-label="Filter by campus"
    >
      <option value="">All campuses</option>
      {campuses.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
