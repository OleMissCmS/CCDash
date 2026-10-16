"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CHMS_ENABLED } from "@/lib/feature-flags";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", match: "/dashboard" },
  { href: "/volunteer-matrix", label: "Volunteer Matrix", match: "/volunteer-matrix" },
  { href: "/monthly-expenses", label: "Monthly Expenses", match: "/monthly-expenses" },
  ...(CHMS_ENABLED
    ? [{ href: "/chms", label: "ChMS", match: "/chms" } as const]
    : []),
];

export function AppTopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-lg bg-base-300/60 p-1 w-fit">
      {LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.match}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-none px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
              active
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-base-content/70 hover:text-base-content"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
