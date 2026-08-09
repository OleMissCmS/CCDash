"use client";

import { useMemo, useState } from "react";
import { formatValue } from "@/lib/format";
import type {
  VolunteerMatrixCampusData,
  VolunteerMatrixRow,
} from "@/lib/google-sheets-volunteer-matrix";
import {
  ministryAreaSlugFromSheetName,
  VOLUNTEER_MATRIX_MINISTRY_AREAS,
  type VolunteerMatrixMinistryAreaSlug,
} from "@/lib/volunteer-matrix-areas";
import {
  getVolunteerMatrixPercentStatus,
  rowPoolFilledPct,
} from "@/lib/volunteer-matrix";
import type { StoplightStatus } from "@/lib/benchmarks";

type VolunteerMatrixBreakdownProps = {
  campuses: VolunteerMatrixCampusData[];
  initialMinistryAreaSlug?: VolunteerMatrixMinistryAreaSlug | null;
};

type FlatRow = {
  campusSlug: string;
  campusLabel: string;
  row: VolunteerMatrixRow;
};

type CampusFilter = "all" | string;
type MinistryAreaFilter = "all" | VolunteerMatrixMinistryAreaSlug;
type TeamFilter = "all" | string;

type SortKey =
  | "campus"
  | "area"
  | "team"
  | "perServiceNeed"
  | "rotationPool"
  | "current"
  | "poolFilled"
  | "needCoverage";

type SortDirection = "asc" | "desc";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

const DEFAULT_SORT: SortState = { key: "area", direction: "asc" };

const POOL_FILLED_TEXT: Record<StoplightStatus, string> = {
  green: "text-[#5a8f6a]",
  yellow: "text-warning",
  red: "text-error",
};

function PoolFilledCell({ percent }: { percent: number | null }) {
  if (percent == null) {
    return <span className="text-base-content/40">—</span>;
  }

  const { status } = getVolunteerMatrixPercentStatus(percent);

  return (
    <span className={`font-semibold ${POOL_FILLED_TEXT[status]}`}>
      {formatValue(percent, "percent")}
    </span>
  );
}

function compareStrings(a: string, b: string, direction: SortDirection): number {
  const result = a.localeCompare(b, undefined, { sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

function compareNumbers(
  a: number | null,
  b: number | null,
  direction: SortDirection
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "asc" ? a - b : b - a;
}

function needCoverageForRow(row: VolunteerMatrixRow): number | null {
  return row.rotationPool > 0 ? (row.current / row.rotationPool) * 100 : null;
}

type SortableHeaderProps = {
  label: string;
  sortKey: SortKey;
  activeSort: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
};

function SortableHeader({
  label,
  sortKey,
  activeSort,
  onSort,
  align = "left",
}: SortableHeaderProps) {
  const active = activeSort.key === sortKey;

  return (
    <th className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-base-content ${
          align === "right" ? "ml-auto" : ""
        } ${active ? "text-base-content" : "text-base-content/60"}`}
        onClick={() => onSort(sortKey)}
        aria-sort={
          active
            ? activeSort.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <span>{label}</span>
        <span className="text-[10px] tabular-nums" aria-hidden>
          {active ? (activeSort.direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

export function VolunteerMatrixBreakdown({
  campuses,
  initialMinistryAreaSlug = null,
}: VolunteerMatrixBreakdownProps) {
  const [campusFilter, setCampusFilter] = useState<CampusFilter>("all");
  const [ministryAreaFilter, setMinistryAreaFilter] =
    useState<MinistryAreaFilter>(initialMinistryAreaSlug ?? "all");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  const flatRows = useMemo<FlatRow[]>(
    () =>
      campuses.flatMap((campus) =>
        campus.rows.map((row) => ({
          campusSlug: campus.slug,
          campusLabel: campus.label,
          row,
        }))
      ),
    [campuses]
  );

  const ministryAreaOptions = useMemo(
    () =>
      VOLUNTEER_MATRIX_MINISTRY_AREAS.filter((area) =>
        flatRows.some(
          (item) => ministryAreaSlugFromSheetName(item.row.area) === area.slug
        )
      ),
    [flatRows]
  );

  const teamOptions = useMemo(
    () =>
      [...new Set(flatRows.map((item) => item.row.team || item.row.ministry))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [flatRows]
  );

  function handleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }

  const filteredRows = useMemo(() => {
    return flatRows.filter((item) => {
      if (campusFilter !== "all" && item.campusSlug !== campusFilter) {
        return false;
      }
      if (ministryAreaFilter !== "all") {
        const areaSlug = ministryAreaSlugFromSheetName(item.row.area);
        if (areaSlug !== ministryAreaFilter) return false;
      }
      if (teamFilter !== "all") {
        const team = item.row.team || item.row.ministry;
        if (team !== teamFilter) return false;
      }
      return true;
    });
  }, [flatRows, campusFilter, ministryAreaFilter, teamFilter]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];

    rows.sort((a, b) => {
      switch (sort.key) {
        case "campus":
          return compareStrings(a.campusLabel, b.campusLabel, sort.direction);
        case "area":
          return compareStrings(a.row.area, b.row.area, sort.direction);
        case "team":
          return compareStrings(
            a.row.team || a.row.ministry,
            b.row.team || b.row.ministry,
            sort.direction
          );
        case "perServiceNeed":
          return compareNumbers(
            a.row.perServiceNeed,
            b.row.perServiceNeed,
            sort.direction
          );
        case "rotationPool":
          return compareNumbers(
            a.row.rotationPool,
            b.row.rotationPool,
            sort.direction
          );
        case "current":
          return compareNumbers(a.row.current, b.row.current, sort.direction);
        case "poolFilled":
          return compareNumbers(
            rowPoolFilledPct(a.row),
            rowPoolFilledPct(b.row),
            sort.direction
          );
        case "needCoverage":
          return compareNumbers(
            needCoverageForRow(a.row),
            needCoverageForRow(b.row),
            sort.direction
          );
        default:
          return 0;
      }
    });

    return rows;
  }, [filteredRows, sort]);

  const filteredTotals = useMemo(() => {
    const perServiceNeed = filteredRows.reduce(
      (sum, item) => sum + item.row.perServiceNeed,
      0
    );
    const rotationPool = filteredRows.reduce(
      (sum, item) => sum + item.row.rotationPool,
      0
    );
    const current = filteredRows.reduce(
      (sum, item) => sum + item.row.current,
      0
    );
    return {
      perServiceNeed,
      rotationPool,
      current,
      poolFilledPct: rotationPool > 0 ? (current / rotationPool) * 100 : null,
      needCoveragePct: rotationPool > 0 ? (current / rotationPool) * 100 : null,
    };
  }, [filteredRows]);

  const showCampusColumn = campuses.length > 1;
  const hasActiveFilters =
    campusFilter !== "all" ||
    ministryAreaFilter !== "all" ||
    teamFilter !== "all";

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="card-title text-base">Ministry breakdown</h2>
            <p className="text-sm text-base-content/60">
              Row-level detail from the campus tabs · click column headers to sort
              {hasActiveFilters && (
                <>
                  {" "}
                  · showing {sortedRows.length} of {flatRows.length} rows
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {showCampusColumn && (
              <label className="form-control w-full sm:w-auto min-w-[10rem]">
                <span className="label-text text-xs font-medium">Campus</span>
                <select
                  className="select select-bordered select-sm"
                  value={campusFilter}
                  onChange={(event) => setCampusFilter(event.target.value)}
                  aria-label="Filter by campus"
                >
                  <option value="all">All campuses</option>
                  {campuses.map((campus) => (
                    <option key={campus.slug} value={campus.slug}>
                      {campus.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="form-control w-full sm:w-auto min-w-[12rem]">
              <span className="label-text text-xs font-medium">Ministry area</span>
              <select
                className="select select-bordered select-sm"
                value={ministryAreaFilter}
                onChange={(event) =>
                  setMinistryAreaFilter(event.target.value as MinistryAreaFilter)
                }
                aria-label="Filter by ministry area"
              >
                <option value="all">All ministry areas</option>
                {ministryAreaOptions.map((area) => (
                  <option key={area.slug} value={area.slug}>
                    {area.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control w-full sm:w-auto min-w-[12rem]">
              <span className="label-text text-xs font-medium">Team</span>
              <select
                className="select select-bordered select-sm"
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                aria-label="Filter by team"
              >
                <option value="all">All teams</option>
                {teamOptions.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                {showCampusColumn && (
                  <SortableHeader
                    label="Campus"
                    sortKey="campus"
                    activeSort={sort}
                    onSort={handleSort}
                  />
                )}
                <SortableHeader
                  label="Area"
                  sortKey="area"
                  activeSort={sort}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Team"
                  sortKey="team"
                  activeSort={sort}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Per service"
                  sortKey="perServiceNeed"
                  activeSort={sort}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="Rotation pool"
                  sortKey="rotationPool"
                  activeSort={sort}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="Current"
                  sortKey="current"
                  activeSort={sort}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="Pool filled"
                  sortKey="poolFilled"
                  activeSort={sort}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="Current vs need"
                  sortKey="needCoverage"
                  activeSort={sort}
                  onSort={handleSort}
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={showCampusColumn ? 9 : 8}
                    className="text-center text-base-content/50 py-8"
                  >
                    No rows match the current filters.
                  </td>
                </tr>
              ) : (
                sortedRows.map((item) => {
                  const poolFilled = rowPoolFilledPct(item.row);
                  const needCoverage = needCoverageForRow(item.row);

                  return (
                    <tr key={`${item.campusSlug}-${item.row.ministry}`}>
                      {showCampusColumn && <td>{item.campusLabel}</td>}
                      <td>{item.row.area}</td>
                      <td className="font-medium">{item.row.team}</td>
                      <td className="text-right tabular-nums">
                        {formatValue(item.row.perServiceNeed, "count")}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatValue(item.row.rotationPool, "count")}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatValue(item.row.current, "count")}
                      </td>
                      <td className="text-right tabular-nums">
                        <PoolFilledCell percent={poolFilled} />
                      </td>
                      <td className="text-right tabular-nums">
                        {needCoverage != null
                          ? formatValue(needCoverage, "percent")
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedRows.length > 0 && (
              <tfoot>
                <tr className="font-semibold">
                  {showCampusColumn && <td />}
                  <td colSpan={2}>
                    {hasActiveFilters ? "Filtered total" : "Total"}
                  </td>
                  <td className="text-right tabular-nums">
                    {formatValue(filteredTotals.perServiceNeed, "count")}
                  </td>
                  <td className="text-right tabular-nums">
                    {formatValue(filteredTotals.rotationPool, "count")}
                  </td>
                  <td className="text-right tabular-nums">
                    {formatValue(filteredTotals.current, "count")}
                  </td>
                  <td className="text-right tabular-nums">
                    <PoolFilledCell percent={filteredTotals.poolFilledPct} />
                  </td>
                  <td className="text-right tabular-nums">
                    {filteredTotals.needCoveragePct != null
                      ? formatValue(filteredTotals.needCoveragePct, "percent")
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
