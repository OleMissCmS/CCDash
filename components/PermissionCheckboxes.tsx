"use client";

import { VIEW_SECTION_LABELS, VIEW_SECTIONS } from "@/lib/sections";
import type { UserPermissions } from "@/lib/permissions";

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

  if (isAdmin) {
    return (
      <p className="text-sm text-base-content/70">
        Administrators have access to all dashboard pages and can edit
        benchmarks.
      </p>
    );
  }

  return (
    <div className="space-y-4">
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
