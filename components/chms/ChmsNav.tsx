"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/chms", label: "My assignments", exact: true },
  { href: "/chms/processes", label: "Processes" },
  { href: "/chms/queues", label: "Queues" },
  { href: "/chms/assignments", label: "Assignments" },
  { href: "/chms/people", label: "People" },
  { href: "/chms/forms", label: "Forms" },
  { href: "/chms/reports", label: "Reports" },
] as const;

export function ChmsNav() {
  const pathname = usePathname();

  return (
    <div role="tablist" className="tabs tabs-boxed bg-base-200 p-1 flex-wrap">
      {TABS.map((tab) => {
        const active =
          "exact" in tab && tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            className={`tab ${active ? "tab-active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
