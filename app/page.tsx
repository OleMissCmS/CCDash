import { redirect } from "next/navigation";
import { isLocalPos } from "@/lib/pos/config";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  if (isLocalPos()) {
    redirect("/pos");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
