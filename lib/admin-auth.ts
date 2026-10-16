import { getUserProfile } from "@/lib/metrics";
import { canManageUsers } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export async function requireUserManager() {
  const supabase = await createClient();
  const profile = await getUserProfile(supabase);

  if (!profile || !canManageUsers(profile)) {
    return { error: "Forbidden" as const, supabase, profile: null };
  }

  return { error: null, supabase, profile };
}
