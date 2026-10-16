import Link from "next/link";
import { ConnectCardForm } from "@/components/chms/ConnectCardForm";
import { BrandLogo } from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/server";
import { getCampuses } from "@/lib/metrics";

export default async function PracticeGuestFormPage() {
  const supabase = await createClient();
  const campuses = await getCampuses(supabase);
  const mountPleasant =
    campuses.find((c) => c.slug === "mount-pleasant") ?? campuses[0];

  return (
    <main className="min-h-screen bg-base-200 p-6 md:p-10">
      <div className="mx-auto max-w-lg space-y-6">
        <BrandLogo showSubtitle href={null} size="sm" />

        <div className="alert alert-warning shadow-sm">
          <div className="space-y-1">
            <p className="font-semibold">Practice mode — staff testing only</p>
            <p className="text-sm">
              Submissions use fake contact info, enter the real guest follow-up
              queue, and are tagged{" "}
              <code className="text-xs">connect_form_practice</code> so you can
              find and delete them later.
            </p>
          </div>
        </div>

        <div className="card bg-base-100 border border-warning/40 border-dashed shadow-sm">
          <div className="card-body gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold">Practice connect card</h1>
                <span className="badge badge-warning badge-outline">Test</span>
              </div>
              <p className="text-sm text-base-content/70">
                Pre-filled with sample data. Submit as-is to run through the full
                ChMS flow, or edit fields first.
              </p>
            </div>

            <ConnectCardForm
              campuses={campuses}
              practice
              practiceDefaults={
                mountPleasant
                  ? {
                      firstName: "Jordan",
                      lastName: "Practice Guest",
                      email: `practice.guest+${Date.now()}@example.com`,
                      phone: "(989) 555-0142",
                      campusId: mountPleasant.id,
                      ministryArea: "groups",
                      comments:
                        "Practice connect card — test run for ChMS guest follow-up. Safe to delete from People & Assignments.",
                    }
                  : undefined
              }
            />
          </div>
        </div>

        <p className="text-center text-sm text-base-content/60">
          Production form:{" "}
          <Link href="/forms/connect" className="link">
            /forms/connect
          </Link>
          {" · "}
          <Link href="/chms/forms" className="link">
            ChMS forms
          </Link>
        </p>
      </div>
    </main>
  );
}
