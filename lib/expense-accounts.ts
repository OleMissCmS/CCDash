export const EXPENSE_CAMPUSES = [
  { slug: "central", label: "Central", accountDigit: "1" },
  { slug: "mount-pleasant", label: "Mount Pleasant", accountDigit: "2" },
  { slug: "alma", label: "Alma", accountDigit: "3" },
  { slug: "st-johns", label: "St. Johns", accountDigit: "4" },
] as const;

export type ExpenseCampusSlug = (typeof EXPENSE_CAMPUSES)[number]["slug"];

/** Ministry area codes (digits 2–3 of the chart of accounts). */
export const MINISTRY_AREA_CODES = [
  "60",
  "61",
  "62",
  "68",
  "69",
  "70",
  "72",
  "73",
  "75",
  "80",
  "81",
  "89",
] as const;

export type MinistryAreaCode = (typeof MINISTRY_AREA_CODES)[number];

export const MINISTRY_CODE_LABELS: Record<MinistryAreaCode, string> = {
  "60": "Community Kids",
  "61": "Community Students",
  "62": "UNiTE",
  "68": "Deacons",
  "69": "Missions",
  "70": "Worship Arts",
  "72": "Hospitality",
  "73": "Communications",
  "75": "Groups",
  "80": "Operations",
  "81": "Facilities",
  "89": "Pastoral",
};

export function expenseCampusFromAccountNumber(
  accountNumber: string
): ExpenseCampusSlug | null {
  const digit = accountNumber.replace(/\D/g, "").charAt(0);
  const campus = EXPENSE_CAMPUSES.find((entry) => entry.accountDigit === digit);
  return campus?.slug ?? null;
}

export function ministryCodeFromAccountNumber(accountNumber: string): string | null {
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length < 3) return null;
  return digits.slice(1, 3);
}

export function ministryAreaLabel(ministryCode: string): string {
  return (
    MINISTRY_CODE_LABELS[ministryCode as MinistryAreaCode] ??
    `Area ${ministryCode}`
  );
}

export function ministryAccountPrefix(
  campusSlug: ExpenseCampusSlug,
  ministryCode: string
): string {
  const campus = EXPENSE_CAMPUSES.find((entry) => entry.slug === campusSlug);
  return `${campus?.accountDigit ?? "1"}${ministryCode}`;
}

export function resolveExpenseCampusSlug(
  raw: string | null | undefined
): ExpenseCampusSlug {
  if (!raw) return "central";
  const match = EXPENSE_CAMPUSES.find((campus) => campus.slug === raw);
  return match?.slug ?? "central";
}

export function expenseCampusLabel(slug: ExpenseCampusSlug): string {
  return (
    EXPENSE_CAMPUSES.find((campus) => campus.slug === slug)?.label ?? "Central"
  );
}

/** Regional campuses (not Central) that get a campus-wide summary card. */
export function isRegionalExpenseCampus(slug: ExpenseCampusSlug): boolean {
  return slug !== "central";
}

export function sortMinistryGroups<T extends { ministryCode: string }>(
  groups: T[]
): T[] {
  const order = new Map(MINISTRY_AREA_CODES.map((code, index) => [code, index]));
  return [...groups].sort(
    (a, b) =>
      (order.get(a.ministryCode as MinistryAreaCode) ?? 99) -
      (order.get(b.ministryCode as MinistryAreaCode) ?? 99)
  );
}
