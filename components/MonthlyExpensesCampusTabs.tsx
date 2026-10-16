"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  EXPENSE_CAMPUSES,
  type ExpenseCampusSlug,
} from "@/lib/expense-accounts";

type MonthlyExpensesCampusTabsProps = {
  activeCampus: ExpenseCampusSlug;
  allowedCampuses: ExpenseCampusSlug[];
};

export function MonthlyExpensesCampusTabs({
  activeCampus,
  allowedCampuses,
}: MonthlyExpensesCampusTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setCampus(campus: ExpenseCampusSlug) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("campus", campus);
    router.push(`/monthly-expenses?${params.toString()}`);
  }

  const campuses = EXPENSE_CAMPUSES.filter((campus) =>
    allowedCampuses.includes(campus.slug)
  );

  return (
    <div
      role="tablist"
      className="sfdc-scoped-nav"
      aria-label="Expense campuses"
    >
      {campuses.map((campus) => (
        <button
          key={campus.slug}
          type="button"
          role="tab"
          aria-selected={activeCampus === campus.slug}
          className={`sfdc-scoped-nav__tab${
            activeCampus === campus.slug ? " sfdc-scoped-nav__tab--active" : ""
          }`}
          onClick={() => setCampus(campus.slug)}
        >
          {campus.label}
        </button>
      ))}
    </div>
  );
}
