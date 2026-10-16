import Link from "next/link";
import { redirect } from "next/navigation";
import { DataSyncPanel } from "@/components/DataSyncPanel";
import { Navbar } from "@/components/Navbar";
import { UserCreateForm } from "@/components/UserCreateForm";
import { UserList } from "@/components/UserList";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ALL_CAMPUS_ACCESS,
  canManageUsers,
  normalizeUserProfile,
} from "@/lib/permissions";
import { getUserProfile } from "@/lib/metrics";
import type { ManagedUser, UserProfile } from "@/lib/types";
import { queryAllUserProfileRows } from "@/lib/user-profile";

async function getManagedUsers(): Promise<ManagedUser[]> {
  const admin = createAdminClient();
  const [{ data: authData }, profiles] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    queryAllUserProfileRows(admin),
  ]);

  const profileById = new Map(
    profiles.map((row) => [row.id, normalizeUserProfile(row)])
  );

  return (authData?.users ?? [])
    .map((user) => {
      const existing = profileById.get(user.id);
      const profile = existing ? normalizeUserProfile(existing) : null;
      return {
        id: user.id,
        email: user.email ?? "",
        display_name:
          profile?.display_name ??
          (user.user_metadata?.display_name as string | undefined) ??
          null,
        role: profile?.role ?? "staff",
        financial_insights: profile?.financial_insights ?? false,
        can_view_overview: profile?.can_view_overview ?? true,
        can_view_adult_discipleship: profile?.can_view_adult_discipleship ?? true,
        can_view_next_gen: profile?.can_view_next_gen ?? true,
        can_view_weekend_reach: profile?.can_view_weekend_reach ?? true,
        can_view_operations: profile?.can_view_operations ?? false,
        can_view_monthly_expenses: profile?.can_view_monthly_expenses ?? false,
        monthly_expenses_scope: profile?.monthly_expenses_scope ?? "all",
        can_view_volunteer_matrix: profile?.can_view_volunteer_matrix ?? true,
        campus_access: profile?.campus_access ?? ALL_CAMPUS_ACCESS,
        can_edit_benchmarks: profile?.can_edit_benchmarks ?? false,
        can_access_chms: profile?.can_access_chms ?? true,
        can_manage_chms_processes: profile?.can_manage_chms_processes ?? false,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export default async function UsersSettingsPage() {
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);

  if (!profile) redirect("/login");
  if (!canManageUsers(profile)) redirect("/dashboard");

  let users: ManagedUser[] = [];
  let loadError: string | null = null;

  try {
    users = await getManagedUsers();
  } catch (err) {
    loadError =
      err instanceof Error
        ? err.message
        : "Failed to load users. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.";
  }

  return (
    <>
      <Navbar profile={profile} />
      <main className="mx-auto w-full max-w-4xl p-4 md:p-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="text-sm text-base-content/70">
              Create staff accounts and control which dashboard pages each person
              can view, plus benchmark editing access.
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            Back to dashboard
          </Link>
        </div>

        <DataSyncPanel />

        {loadError ? (
          <div className="alert alert-warning text-sm">{loadError}</div>
        ) : (
          <>
            <UserCreateForm />
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body">
                <h2 className="card-title text-lg">All users</h2>
                <UserList users={users} />
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
