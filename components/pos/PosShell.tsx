"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isLocalPos } from "@/lib/pos/config";

const NAV = [
  { href: "/pos", label: "Checkout" },
  { href: "/pos/inventory", label: "Inventory" },
  { href: "/pos/patients", label: "Patients" },
  { href: "/pos/orders", label: "Orders" },
];

export function PosShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    if (isLocalPos()) {
      window.location.href = "/pos";
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <header className="navbar bg-base-100 border-b border-base-300 px-4 lg:px-8">
        <div className="flex-1">
          <Link href="/pos" className="text-xl font-bold text-primary">
            Clinic POS
          </Link>
          <span className="ml-2 hidden text-sm text-base-content/60 sm:inline">
            Supplements &amp; wellness products
          </span>
          {isLocalPos() && (
            <span className="badge badge-warning badge-sm ml-2">Local mode</span>
          )}
        </div>
        <nav className="flex-none">
          <ul className="menu menu-horizontal gap-1 px-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    pathname === item.href ||
                    (item.href !== "/pos" && pathname.startsWith(item.href))
                      ? "active font-semibold"
                      : ""
                  }
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={signOut}>
                Sign out
              </button>
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
