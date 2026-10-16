"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_PERMISSIONS,
  permissionsFromProfile,
} from "@/lib/permissions";
import type { ManagedUser } from "@/lib/types";
import {
  PermissionCheckboxes,
  type PermissionFormState,
} from "./PermissionCheckboxes";

type UserEditModalProps = {
  user: ManagedUser | null;
  open: boolean;
  onClose: () => void;
};

export function UserEditModal({ user, open, onClose }: UserEditModalProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [permissions, setPermissions] = useState<PermissionFormState>(
    ADMIN_PERMISSIONS
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? "");
    setRole(user.role);
    setPermissions(permissionsFromProfile(user));
    setError(null);
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);
    if (role === "staff" && permissions.campus_access.length === 0) {
      setError("Select at least one campus access option.");
      return;
    }
    if (
      role === "staff" &&
      permissions.can_view_monthly_expenses &&
      permissions.monthly_expenses_scope.length === 0
    ) {
      setError("Select at least one expense campus.");
      return;
    }
    setLoading(true);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        role,
        permissions: role === "staff" ? permissions : undefined,
      }),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "Failed to update user");
      return;
    }

    onClose();
    router.refresh();
  }

  if (!open || !user) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-semibold text-lg">Edit user</h3>
        <p className="text-sm text-base-content/70 mt-1 mb-4">{user.email}</p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <label className="form-control">
            <span className="label-text">Display name</span>
            <input
              type="text"
              className="input input-bordered"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text">Role</span>
            <select
              className="select select-bordered"
              value={role}
              onChange={(e) => setRole(e.target.value as "staff" | "admin")}
            >
              <option value="staff">Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </label>

          <PermissionCheckboxes
            value={permissions}
            onChange={setPermissions}
            isAdmin={role === "admin"}
          />

          {error && <div className="alert alert-error text-sm">{error}</div>}

          <div className="modal-action mt-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
    </dialog>
  );
}
