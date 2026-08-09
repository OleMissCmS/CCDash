import {
  fetchConnectEventsBaptisms,
  filterConnectEventsByCampus,
  type ConnectCampusSlug,
} from "@/lib/google-sheets-connect-events";
import type { Campus } from "@/lib/types";

const CAMPUS_SLUG_MAP: Record<string, ConnectCampusSlug> = {
  "mount-pleasant": "mount-pleasant",
  alma: "alma",
  "st-johns": "st-johns",
};

export async function getConnectEventsBaptismsForCampus(
  campusId: string | null,
  campuses: Campus[]
) {
  const data = await fetchConnectEventsBaptisms();
  if (!campusId) return data;

  const campus = campuses.find((item) => item.id === campusId);
  if (!campus) return data;

  const slug = CAMPUS_SLUG_MAP[campus.slug];
  return filterConnectEventsByCampus(data, slug ?? null);
}
