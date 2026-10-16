"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SfdcRefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="sfdc-btn sfdc-btn--neutral"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
