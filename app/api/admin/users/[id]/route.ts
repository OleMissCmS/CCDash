import { NextResponse } from "next/server";
import { requireUserManager } from "@/lib/admin-auth";
import {
  ADMIN_PERMISSIONS,
  ALL_CAMPUS_ACCESS,
  normalizeCampusAccess,
} from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/lib/types";

type UpdateUserBody = {
  displayName?: string;
  role?: "staff" | "admin";
  permissions?: Partial<UserProfile>;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, profile } = await requireUserManager();
  if (error || !profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === profile.id && request.headers.get("x-self-edit") !== "1") {
    // Admins can edit themselves through the same form; allow unless demoting last admin
  }

  let body: UpdateUserBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const role = body.role ?? "staff";
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.displayName !== undefined) {
    updates.display_name = body.displayName.trim() || null;
  }

  if (role === "admin") {
    Object.assign(updates, {
      role: "admin",
      ...ADMIN_PERMISSIONS,
      financial_insights: true,
      can_access_chms: true,
      can_manage_chms_processes: true,
      can_view_monthly_expenses: true,
      monthly_expenses_scope: "all",
    });
  } else {
    const permissions = body.permissions ?? {};
    const campusAccess =
      permissions.campus_access === undefined
        ? ALL_CAMPUS_ACCESS
        : normalizeCampusAccess(permissions.campus_access);
    if (campusAccess.length === 0) {
      return NextResponse.json(
        { error: "Select at least one campus access option" },
        { status: 400 }
      );
    }
    Object.assign(updates, {
      role: "staff",
      can_view_overview: permissions.can_view_overview ?? true,
      can_view_adult_discipleship:
        permissions.can_view_adult_discipleship ?? true,
      can_view_next_gen: permissions.can_view_next_gen ?? true,
      can_view_weekend_reach: permissions.can_view_weekend_reach ?? true,
      can_view_operations: permissions.can_view_operations ?? false,
      can_view_monthly_expenses:
        permissions.can_view_monthly_expenses ??
        permissions.can_view_operations ??
        false,
      monthly_expenses_scope: permissions.monthly_expenses_scope ?? "all",
      can_view_volunteer_matrix: permissions.can_view_volunteer_matrix ?? true,
      campus_access: campusAccess,
      can_edit_benchmarks: permissions.can_edit_benchmarks ?? false,
      can_access_chms: permissions.can_access_chms ?? true,
      can_manage_chms_processes: permissions.can_manage_chms_processes ?? false,
      financial_insights: permissions.can_view_operations ?? false,
    });
  }

  try {
    const admin = createAdminClient();

    if (role !== "admin") {
      const { count, error: adminCountError } = await admin
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (adminCountError) {
        return NextResponse.json({ error: adminCountError.message }, { status: 500 });
      }

      const { data: target, error: targetError } = await admin
        .from("user_profiles")
        .select("role")
        .eq("id", id)
        .single();

      if (targetError) {
        return NextResponse.json({ error: targetError.message }, { status: 404 });
      }

      if (target.role === "admin" && (count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last administrator" },
          { status: 400 }
        );
      }
    }

    const { data, error: updateError } = await admin
      .from("user_profiles")
      .update(updates)
      .eq("id", id)
      .select(
        "id, display_name, role, financial_insights, can_view_overview, can_view_adult_discipleship, can_view_next_gen, can_view_weekend_reach, can_view_operations, can_view_monthly_expenses, monthly_expenses_scope, can_view_volunteer_matrix, campus_access, can_edit_benchmarks, can_access_chms, can_manage_chms_processes"
      )
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (body.displayName !== undefined) {
      await admin.auth.admin.updateUserById(id, {
        user_metadata: { display_name: body.displayName.trim() },
      });
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
