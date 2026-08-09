import {
  fetchFirstTimeGuests,
  filterFirstTimeGuestsByCampus,
  type GuestCampusSlug,
} from "@/lib/google-sheets-first-time-guests";
import type { Campus } from "@/lib/types";

const CAMPUS_SLUG_MAP: Record<string, GuestCampusSlug> = {
  "mount-pleasant": "mount-pleasant",
  alma: "alma",
  "st-johns": "st-johns",
};

export async function getFirstTimeGuestsForCampus(
  campusId: string | null,
  campuses: Campus[]
) {
  const data = await fetchFirstTimeGuests();
  if (!campusId) return data;

  const campus = campuses.find((item) => item.id === campusId);
  if (!campus) return data;

  const slug = CAMPUS_SLUG_MAP[campus.slug];
  return filterFirstTimeGuestsByCampus(data, slug ?? null);
}
