import { PrayerForm } from "@/components/chms/PrayerForm";
import { BrandLogo } from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/server";
import { getCampuses } from "@/lib/metrics";

export default async function PublicPrayerFormPage() {
  const supabase = await createClient();
  const campuses = await getCampuses(supabase);

  return (
    <main className="min-h-screen bg-base-200 p-6 md:p-10">
      <div className="mx-auto max-w-lg space-y-6">
        <BrandLogo showSubtitle href={null} size="sm" />
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body gap-4">
            <div>
              <h1 className="text-xl font-semibold">Prayer request</h1>
              <p className="text-sm text-base-content/70">
                Share how we can pray for you. Our pastoral team will receive
                your request.
              </p>
            </div>
            <PrayerForm campuses={campuses} />
          </div>
        </div>
      </div>
    </main>
  );
}
