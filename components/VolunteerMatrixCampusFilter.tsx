"use client";

import {
  VOLUNTEER_MATRIX_CAMPUS_TABS,
  type VolunteerCampusSlug,
} from "@/lib/google-sheets-volunteer-matrix";
import {
  VOLUNTEER_MATRIX_MINISTRY_AREAS,
  resolveVolunteerMatrixMinistryAreaSlug,
} from "@/lib/volunteer-matrix-areas";
import { useRouter, useSearchParams } from "next/navigation";

function useVolunteerMatrixParams() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    router.push(query ? `/volunteer-matrix?${query}` : "/volunteer-matrix");
  }

  return { searchParams, updateParam };
}

type VolunteerMatrixCampusScopeProps = {
  selectedCampusSlug?: VolunteerCampusSlug | null;
  allowedCampusSlugs?: VolunteerCampusSlug[] | null;
};

export function VolunteerMatrixCampusFilter({
  selectedCampusSlug,
  allowedCampusSlugs = null,
}: VolunteerMatrixCampusScopeProps) {
  const { searchParams, updateParam } = useVolunteerMatrixParams();
  const current =
    selectedCampusSlug !== undefined
      ? selectedCampusSlug ?? "all"
      : searchParams.get("campus") ?? "all";
  const showAllOption = allowedCampusSlugs == null;
  const campusOptions = allowedCampusSlugs
    ? VOLUNTEER_MATRIX_CAMPUS_TABS.filter((campus) =>
        allowedCampusSlugs.includes(campus.slug)
      )
    : VOLUNTEER_MATRIX_CAMPUS_TABS;
  const optionCount = campusOptions.length + (showAllOption ? 1 : 0);

  return (
    <label className="navbar-field">
      <span className="navbar-field-label">Campus</span>
      <select
        className="navbar-select"
        value={current}
        onChange={(event) => updateParam("campus", event.target.value)}
        aria-label="Campus filter"
        disabled={optionCount <= 1}
      >
        {showAllOption && <option value="all">All campuses</option>}
        {campusOptions.map((campus) => (
          <option key={campus.slug} value={campus.slug}>
            {campus.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function VolunteerMatrixMinistryAreaFilter() {
  const { searchParams, updateParam } = useVolunteerMatrixParams();
  const current = searchParams.get("ministry") ?? "all";

  return (
    <label className="navbar-field">
      <span className="navbar-field-label">Ministry</span>
      <select
        className="navbar-select"
        value={current}
        onChange={(event) => updateParam("ministry", event.target.value)}
        aria-label="Ministry area filter"
      >
        <option value="all">All ministry areas</option>
        {VOLUNTEER_MATRIX_MINISTRY_AREAS.map((area) => (
          <option key={area.slug} value={area.slug}>
            {area.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function VolunteerMatrixPageFilters(
  props: VolunteerMatrixCampusScopeProps
) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <VolunteerMatrixCampusFilter {...props} />
      <VolunteerMatrixMinistryAreaFilter />
    </div>
  );
}

export function parseVolunteerMatrixCampusParam(
  raw: string | undefined
): VolunteerCampusSlug | null {
  if (!raw || raw === "all") return null;
  const match = VOLUNTEER_MATRIX_CAMPUS_TABS.find((campus) => campus.slug === raw);
  return match?.slug ?? null;
}

export { resolveVolunteerMatrixMinistryAreaSlug as parseVolunteerMatrixMinistryAreaParam };
