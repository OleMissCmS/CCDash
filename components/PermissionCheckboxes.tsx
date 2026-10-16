"use client";

import { VIEW_SECTION_LABELS, VIEW_SECTIONS } from "@/lib/sections";
import {
  ALL_CAMPUS_ACCESS,
  ALL_EXPENSE_SCOPES,
  CAMPUS_ACCESS_OPTIONS,
  EXPENSE_SCOPE_OPTIONS,
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
    if (key === "can_view_monthly_expenses" && checked && value.monthly_expenses_scope.length === 0) {
      onChange({
        ...value,
        can_view_monthly_expenses: true,
        monthly_expenses_scope: [...ALL_EXPENSE_SCOPES],
      });
      return;
    }
    onChange({ ...value, [key]: checked });
  }

  function toggleExpenseScope(option: MonthlyExpensesScope, checked: boolean) {
    const next = checked
      ? [...value.monthly_expenses_scope, option]
      : value.monthly_expenses_scope.filter((item) => item !== option);
    onChange({
      ...value,
      monthly_expenses_scope: ALL_EXPENSE_SCOPES.filter((item) =>
        next.includes(item)
      ),
    });
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
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPENSE_SCOPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="label cursor-pointer justify-start gap-3 py-1"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={value.monthly_expenses_scope.includes(option.value)}
                  disabled={disabled}
                  onChange={(e) =>
                    toggleExpenseScope(option.value, e.target.checked)
                  }
                />
                <span className="label-text">{option.label}</span>
              </label>
            ))}
            {value.monthly_expenses_scope.length === 0 ? (
              <p className="text-xs text-error sm:col-span-2">
                Select at least one expense campus.
              </p>
            ) : (
              !hasFullCampusAccess && (
                <p className="text-xs text-base-content/60 sm:col-span-2">
                  Central also requires Church-wide campus access, and each
                  campus requires its own campus access box.
                </p>
              )
            )}
          </div>
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
