import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { AppTopNav } from "@/components/AppTopNav";
import { ChmsNav } from "@/components/chms/ChmsNav";
import { CampusFilterChms } from "@/components/chms/CampusFilterChms";
import { requireChmsAccess } from "@/lib/chms/server-auth";
import { getCampuses } from "@/lib/metrics";

export default async function ChmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, profile } = await requireChmsAccess();
  const campuses = await getCampuses(supabase);

  return (
    <>
      <Navbar profile={profile} />
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8 space-y-6">
        <header className="space-y-4">
          <AppTopNav />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Church Management
            </h1>
            <p className="text-sm text-base-content/70">
              Process queues · people · forms — replacing CCB workflows
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ChmsNav />
            <Suspense fallback={null}>
              <CampusFilterChms campuses={campuses} />
            </Suspense>
          </div>
        </header>
        {children}
      </main>
    </>
  );
}
