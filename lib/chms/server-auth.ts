import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHMS_ENABLED } from "@/lib/feature-flags";
import { canAccessChms } from "@/lib/chms/permissions";
import { getUserProfile } from "@/lib/metrics";

export async function requireChmsAccess() {
  if (!CHMS_ENABLED) redirect("/dashboard");

  const supabase = await createClient();
  const profile = await getUserProfile(supabase);
  if (!profile) redirect("/login");
  if (!canAccessChms(profile)) redirect("/dashboard");
  return { supabase, profile };
}
