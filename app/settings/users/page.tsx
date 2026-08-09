import Link from "next/link";
import { redirect } from "next/navigation";
import { DataSyncPanel } from "@/components/DataSyncPanel";
import { Navbar } from "@/components/Navbar";
import { UserCreateForm } from "@/components/UserCreateForm";
import { UserList } from "@/components/UserList";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageUsers } from "@/lib/permissions";
import { getUserProfile } from "@/lib/metrics";
import type { ManagedUser, UserProfile } from "@/lib/types";

async function getManagedUsers(): Promise<ManagedUser[]> {
  const admin = createAdminClient();
  const [{ data: authData }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("user_profiles").select(
      "id, display_name, role, financial_insights, can_view_overview, can_view_adult_discipleship, can_view_next_gen, can_view_weekend_reach, can_view_operations, can_edit_benchmarks, can_access_chms, can_manage_chms_processes"
    ),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((row) => [row.id, row as UserProfile])
  );

  return (authData?.users ?? [])
    .map((user) => {
      const existing = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email ?? "",
        display_name:
          existing?.display_name ??
          (user.user_metadata?.display_name as string | undefined) ??
          null,
        role: existing?.role ?? "staff",
        financial_insights: existing?.financial_insights ?? false,
        can_view_overview: existing?.can_view_overview ?? true,
        can_view_adult_discipleship: existing?.can_view_adult_discipleship ?? true,
        can_view_next_gen: existing?.can_view_next_gen ?? true,
        can_view_weekend_reach: existing?.can_view_weekend_reach ?? true,
        can_view_operations: existing?.can_view_operations ?? false,
        can_edit_benchmarks: existing?.can_edit_benchmarks ?? false,
        can_access_chms: existing?.can_access_chms ?? true,
        can_manage_chms_processes: existing?.can_manage_chms_processes ?? false,
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
