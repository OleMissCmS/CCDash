"use client";

import { VIEW_SECTION_LABELS, VIEW_SECTIONS } from "@/lib/sections";
import { EXPENSE_CAMPUSES } from "@/lib/expense-accounts";
import {
  ALL_CAMPUS_ACCESS,
  CAMPUS_ACCESS_OPTIONS,
  type UserPermissions,
} from "@/lib/permissions";
import type { CampusAccessOption, MonthlyExpensesScope } from "@/lib/types";

export type PermissionFormState = UserPermissions;

type PermissionCheckboxesProps = {
  value: PermissionFormState;
  onChange: (next: PermissionFormState) => void;
  disabled?: boolean;
  isAdmin?: boolean;
};

export function PermissionCheckboxes({
  value,
  onChange,
  disabled = false,
  isAdmin = false,
}: PermissionCheckboxesProps) {
  function togglePage(key: keyof UserPermissions, checked: boolean) {
    onChange({ ...value, [key]: checked });
  }

  function setExpensesScope(scope: MonthlyExpensesScope) {
    onChange({ ...value, monthly_expenses_scope: scope });
  }

  if (isAdmin) {
    return (
      <p className="text-sm text-base-content/70">
        Administrators have access to all dashboard pages and can edit
        benchmarks.
      </p>
    );
  }

  function toggleCampusAccess(option: CampusAccessOption, checked: boolean) {
    const next = checked
      ? [...value.campus_access, option]
      : value.campus_access.filter((item) => item !== option);
    onChange({
      ...value,
      campus_access: ALL_CAMPUS_ACCESS.filter((item) => next.includes(item)),
    });
  }

  const hasFullCampusAccess =
    value.campus_access.length === ALL_CAMPUS_ACCESS.length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-2">Campus access</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CAMPUS_ACCESS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="label cursor-pointer justify-start gap-3 py-1"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={value.campus_access.includes(option.value)}
                disabled={disabled}
                onChange={(e) =>
                  toggleCampusAccess(option.value, e.target.checked)
                }
              />
              <span className="label-text">{option.label}</span>
            </label>
          ))}
        </div>
        {value.campus_access.length === 0 ? (
          <p className="text-xs text-error mt-1">
            Select at least one campus access option.
          </p>
        ) : (
          !hasFullCampusAccess && (
            <p className="text-xs text-base-content/60 mt-1">
              Dashboard, Volunteer Matrix, and Monthly Expenses only show the
              checked options. Views that compare every campus are hidden.
            </p>
          )
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Dashboard pages</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VIEW_SECTIONS.filter((section) => section !== "vital-signs").map((section) => {
            const key =
              section === "overview"
                ? "can_view_overview"
                : section === "adult-discipleship"
                  ? "can_view_adult_discipleship"
                  : section === "next-gen"
                    ? "can_view_next_gen"
                    : section === "weekend-reach"
                      ? "can_view_weekend_reach"
                      : "can_view_operations";

            return (
              <label
                key={section}
                className="label cursor-pointer justify-start gap-3 py-1"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={value[key]}
                  disabled={disabled}
                  onChange={(e) => togglePage(key, e.target.checked)}
                />
                <span className="label-text">
                  {VIEW_SECTION_LABELS[section]}
                  {section === "overview" ? " (+ Vital Signs)" : ""}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Volunteer matrix</p>
        <label className="label cursor-pointer justify-start gap-3 py-1">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={value.can_view_volunteer_matrix}
            disabled={disabled}
            onChange={(e) =>
              togglePage("can_view_volunteer_matrix", e.target.checked)
            }
          />
          <span className="label-text">View volunteer matrix</span>
        </label>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Monthly expenses</p>
        <label className="label cursor-pointer justify-start gap-3 py-1">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={value.can_view_monthly_expenses}
            disabled={disabled}
            onChange={(e) =>
              togglePage("can_view_monthly_expenses", e.target.checked)
            }
          />
          <span className="label-text">View monthly expenses dashboard</span>
        </label>

        {value.can_view_monthly_expenses && (
          <label className="form-control mt-2">
            <span className="label-text">Expense access scope</span>
            <select
              className="select select-bordered select-sm mt-1"
              value={value.monthly_expenses_scope}
              disabled={disabled}
              onChange={(e) =>
                setExpensesScope(e.target.value as MonthlyExpensesScope)
              }
            >
              <option value="all">All campuses (executive / central)</option>
              {EXPENSE_CAMPUSES.map((campus) => (
                <option key={campus.slug} value={campus.slug}>
                  {campus.label} only
                </option>
              ))}
            </select>
            {!hasFullCampusAccess && (
              <span className="text-xs text-base-content/60 mt-1">
                Also limited by campus access: Central requires Church-wide, and
                each campus requires its own box.
              </span>
            )}
          </label>
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Editing</p>
        <label className="label cursor-pointer justify-start gap-3 py-1">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={value.can_edit_benchmarks}
            disabled={disabled}
            onChange={(e) =>
              togglePage("can_edit_benchmarks", e.target.checked)
            }
          />
          <span className="label-text">Edit benchmarks</span>
        </label>
      </div>
    </div>
  );
}
