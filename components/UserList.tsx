"use client";

import { useState } from "react";
import { VIEW_SECTION_LABELS, VIEW_SECTIONS } from "@/lib/sections";
import { canEditBenchmarks } from "@/lib/permissions";
import type { ManagedUser } from "@/lib/types";
import { UserEditModal } from "./UserEditModal";

type UserListProps = {
  users: ManagedUser[];
};

function summarizeAccess(user: ManagedUser): string {
  if (user.role === "admin") return "All pages · Edit benchmarks";

  const pages = VIEW_SECTIONS.filter((section) => {
    if (section === "vital-signs" || section === "overview") {
      return user.can_view_overview;
    }
    if (section === "adult-discipleship") return user.can_view_adult_discipleship;
    if (section === "next-gen") return user.can_view_next_gen;
    if (section === "weekend-reach") return user.can_view_weekend_reach;
    return user.can_view_operations;
  }).map((section) => VIEW_SECTION_LABELS[section]);

  const extras = canEditBenchmarks(user) ? ["Edit benchmarks"] : [];
  return [...pages, ...extras].join(" · ") || "No access";
}

export function UserList({ users }: UserListProps) {
  const [selected, setSelected] = useState<ManagedUser | null>(null);

  if (users.length === 0) {
    return (
      <p className="text-sm text-base-content/60">No users found yet.</p>
    );
  }

  return (
    <>
      <p className="text-sm text-base-content/60 mb-3">Click a row to edit permissions.</p>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-base-200 cursor-pointer transition-colors"
                onClick={() => setSelected(user)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(user);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Edit permissions for ${user.email}`}
              >
                <td>{user.display_name ?? "—"}</td>
                <td>{user.email}</td>
                <td className="capitalize">{user.role}</td>
                <td className="text-base-content/70">{summarizeAccess(user)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserEditModal
        user={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
