"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_STAFF_PERMISSIONS } from "@/lib/permissions";
import {
  PermissionCheckboxes,
  type PermissionFormState,
} from "./PermissionCheckboxes";

export function UserCreateForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [permissions, setPermissions] =
    useState<PermissionFormState>(DEFAULT_STAFF_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        displayName,
        role,
        permissions: role === "staff" ? permissions : undefined,
      }),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "Failed to create user");
      return;
    }

    setMessage(`Created ${result.user.email}`);
    setEmail("");
    setPassword("");
    setDisplayName("");
    setRole("staff");
    setPermissions(DEFAULT_STAFF_PERMISSIONS);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card bg-base-100 border border-base-300 shadow-sm"
    >
      <div className="card-body gap-4">
        <h2 className="card-title text-lg">Add user</h2>
        <p className="text-sm text-base-content/70">
          Create a staff account and choose which dashboard pages they can view.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text">Email</span>
            <input
              type="email"
              className="input input-bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text">Temporary password</span>
            <input
              type="password"
              className="input input-bordered"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text">Display name</span>
            <input
              type="text"
              className="input input-bordered"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional"
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
        </div>

        <PermissionCheckboxes
          value={permissions}
          onChange={setPermissions}
          isAdmin={role === "admin"}
        />

        {error && <div className="alert alert-error text-sm">{error}</div>}
        {message && <div className="alert alert-success text-sm">{message}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create user"}
        </button>
      </div>
    </form>
  );
}
