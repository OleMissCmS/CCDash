"use client";

import type { YearMode } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

export function YearToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("year") as YearMode) ?? "fiscal";

  function setYear(year: YearMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="navbar-field">
      <span className="navbar-field-label">Year view</span>
      <div className="navbar-segmented">
        <button
          type="button"
          className={`navbar-segment ${current === "fiscal" ? "navbar-segment-active" : ""}`}
          onClick={() => setYear("fiscal")}
        >
          Fiscal year
        </button>
        <button
          type="button"
          className={`navbar-segment ${current === "calendar" ? "navbar-segment-active" : ""}`}
          onClick={() => setYear("calendar")}
        >
          Calendar year
        </button>
      </div>
    </div>
  );
}
