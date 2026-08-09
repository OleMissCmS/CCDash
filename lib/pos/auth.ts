import { createClient } from "@/lib/supabase/server";
import { isLocalPos } from "@/lib/pos/config";
import { LOCAL_STAFF_ID } from "@/lib/pos/store";

export async function requirePosUser() {
  if (isLocalPos()) {
    return {
      supabase: null,
      user: { id: LOCAL_STAFF_ID },
      error: null as null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null as null, error: "Unauthorized" as const };
  }

  return { supabase, user, error: null as null };
}
