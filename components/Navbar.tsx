"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  canEditBenchmarks,
  canManageUsers,
  isAdmin,
} from "@/lib/permissions";
import type { UserProfile } from "@/lib/types";
import { BrandLogo } from "./BrandLogo";
import { ThemeSelector } from "./ThemeSelector";

type NavbarProps = {
  profile: UserProfile | null;
  campusFilter?: React.ReactNode;
  yearToggle?: React.ReactNode;
};

export function Navbar({
  profile,
  campusFilter,
  yearToggle,
}: NavbarProps) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="navbar-brand-bar">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo showSubtitle href="/dashboard" />
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSelector />
            {profile && canEditBenchmarks(profile) && (
              <Link href="/settings/benchmarks" className="navbar-link">
                Benchmarks
              </Link>
            )}
            {profile && isAdmin(profile) && (
              <Link href="/settings/alerts" className="navbar-link">
                Alerts
              </Link>
            )}
            {profile && canManageUsers(profile) && (
              <Link href="/settings/users" className="navbar-link">
                Users
              </Link>
            )}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="navbar-user-btn">
                {profile?.display_name ?? "Staff"}
              </div>
              <ul
                tabIndex={0}
                className="menu dropdown-content z-50 mt-2 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg text-base-content"
              >
                <li className="menu-title text-xs">
                  {profile?.role === "admin" ? "Administrator" : "Staff"}
                  {profile?.can_view_operations && " · Operations access"}
                  {profile?.can_edit_benchmarks && " · Benchmark editor"}
                </li>
                <li>
                  <button type="button" onClick={signOut}>
                    Sign out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="navbar-controls">
          {campusFilter}
          {yearToggle}
        </div>
      </div>
    </header>
  );
}
