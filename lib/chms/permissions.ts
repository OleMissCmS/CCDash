import type { UserProfile } from "@/lib/types";

export function canAccessChms(profile: UserProfile): boolean {
  return profile.role === "admin" || profile.can_access_chms;
}

export function canManageChmsProcesses(profile: UserProfile): boolean {
  return profile.role === "admin" || profile.can_manage_chms_processes;
}
