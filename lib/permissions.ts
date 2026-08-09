import type { ViewSection } from "./sections";
import { parseViewSection, VIEW_SECTIONS } from "./sections";
import type { UserProfile } from "./types";

export type UserPermissions = {
  can_view_overview: boolean;
  can_view_adult_discipleship: boolean;
  can_view_next_gen: boolean;
  can_view_weekend_reach: boolean;
  can_view_operations: boolean;
  can_edit_benchmarks: boolean;
};

export const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  can_view_overview: true,
  can_view_adult_discipleship: true,
  can_view_next_gen: true,
  can_view_weekend_reach: true,
  can_view_operations: false,
  can_edit_benchmarks: false,
};

export const ADMIN_PERMISSIONS: UserPermissions = {
  can_view_overview: true,
  can_view_adult_discipleship: true,
  can_view_next_gen: true,
  can_view_weekend_reach: true,
  can_view_operations: true,
  can_edit_benchmarks: true,
};

const SECTION_PERMISSION_KEY: Record<
  ViewSection,
  keyof UserPermissions
> = {
  "vital-signs": "can_view_overview",
  overview: "can_view_overview",
  "adult-discipleship": "can_view_adult_discipleship",
  "next-gen": "can_view_next_gen",
  "weekend-reach": "can_view_weekend_reach",
  operations: "can_view_operations",
};

export function isAdmin(profile: UserProfile): boolean {
  return profile.role === "admin";
}

export function canManageUsers(profile: UserProfile): boolean {
  return isAdmin(profile);
}

export function canEditBenchmarks(profile: UserProfile): boolean {
  return isAdmin(profile) || profile.can_edit_benchmarks;
}

export function canViewOperations(profile: UserProfile): boolean {
  return isAdmin(profile) || profile.can_view_operations;
}

export function canViewSection(
  profile: UserProfile,
  section: ViewSection
): boolean {
  if (isAdmin(profile)) return true;
  return profile[SECTION_PERMISSION_KEY[section]];
}

export function allowedSections(profile: UserProfile): ViewSection[] {
  return VIEW_SECTIONS.filter((section) => canViewSection(profile, section));
}

export function defaultSection(profile: UserProfile): ViewSection {
  return allowedSections(profile)[0] ?? "overview";
}

export function permissionsFromProfile(
  profile: UserProfile
): UserPermissions {
  return {
    can_view_overview: profile.can_view_overview,
    can_view_adult_discipleship: profile.can_view_adult_discipleship,
    can_view_next_gen: profile.can_view_next_gen,
    can_view_weekend_reach: profile.can_view_weekend_reach,
    can_view_operations: profile.can_view_operations,
    can_edit_benchmarks: profile.can_edit_benchmarks,
  };
}

export function resolveSectionForProfile(
  profile: UserProfile,
  raw: string | undefined
): ViewSection {
  const allowed = allowedSections(profile);
  if (allowed.length === 0) return "overview";

  const requested = parseViewSection(raw, allowed[0]);

  if (canViewSection(profile, requested)) return requested;
  return allowed[0];
}
