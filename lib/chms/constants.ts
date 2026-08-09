export const MINISTRY_AREAS = [
  { value: "kids", label: "Kids / Next Gen" },
  { value: "students", label: "Students" },
  { value: "worship", label: "Worship / Production" },
  { value: "hospitality", label: "Hospitality / Greeters" },
  { value: "groups", label: "Small Groups" },
  { value: "pastoral", label: "Pastoral / Prayer" },
] as const;

export type MinistryArea = (typeof MINISTRY_AREAS)[number]["value"];

export const ASSIGNMENT_STATUS_LABELS: Record<
  "open" | "in_progress" | "done",
  string
> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
};

export const CONTACT_TYPES = [
  { value: "call", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "text", label: "Text" },
  { value: "in_person", label: "In person" },
  { value: "note", label: "Note only" },
] as const;

export const GUEST_CONTACT_TEMPLATE = `Hi {firstName},

Thank you for visiting Community Church! We'd love to connect with you and help you find your next step.

Would you have a few minutes this week for a quick call?

Blessings,
{staffName}`;

export function ministryAreaLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return MINISTRY_AREAS.find((a) => a.value === value)?.label ?? value;
}

export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return result;
}
