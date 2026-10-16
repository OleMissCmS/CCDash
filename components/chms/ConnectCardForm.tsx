"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MINISTRY_AREAS } from "@/lib/chms/constants";
import type { Campus } from "@/lib/types";

export type ConnectCardPracticeDefaults = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  campusId: string;
  ministryArea: string;
  comments: string;
};

type ConnectCardFormProps = {
  campuses: Campus[];
  practice?: boolean;
  practiceDefaults?: ConnectCardPracticeDefaults;
};

export function ConnectCardForm({
  campuses,
  practice = false,
  practiceDefaults,
}: ConnectCardFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const defaults = useMemo(() => {
    if (!practice) return null;
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const fallbackCampus = campuses[0]?.id ?? "";
    return (
      practiceDefaults ?? {
        firstName: "Jordan",
        lastName: `Practice Guest ${stamp}`,
        email: `practice.guest+${Date.now()}@example.com`,
        phone: "(989) 555-0142",
        campusId: fallbackCampus,
        ministryArea: "groups",
        comments:
          "Practice connect card — test run for ChMS guest follow-up. Safe to delete from People & Assignments.",
      }
    );
  }, [practice, practiceDefaults, campuses]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (practice) payload.isPractice = "true";

    const res = await fetch("/api/chms/forms/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error ?? "Something went wrong");
      return;
    }

    setStatus("done");
    setMessage(
      practice
        ? "Practice submission received. Check ChMS → Assignments or Queues to work the test guest through the process."
        : "Thank you! A staff member will reach out within 48 hours."
    );
    if (!practice) e.currentTarget.reset();
  }

  if (status === "done") {
    return (
      <div className="space-y-3">
        <div className="alert alert-success">
          <span>{message}</span>
        </div>
        {practice && (
          <div className="flex flex-wrap gap-2">
            <Link href="/chms/assignments" className="btn btn-primary btn-sm">
              View ChMS assignments
            </Link>
            <Link href="/forms/practice" className="btn btn-outline btn-sm">
              Submit another practice guest
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {practice && (
        <input type="hidden" name="isPractice" value="true" />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="form-control">
          <span className="label-text">First name *</span>
          <input
            name="firstName"
            required
            className="input input-bordered"
            autoComplete="given-name"
            defaultValue={defaults?.firstName}
          />
        </label>
        <label className="form-control">
          <span className="label-text">Last name *</span>
          <input
            name="lastName"
            required
            className="input input-bordered"
            autoComplete="family-name"
            defaultValue={defaults?.lastName}
          />
        </label>
      </div>

      <label className="form-control">
        <span className="label-text">Email</span>
        <input
          name="email"
          type="email"
          className="input input-bordered"
          autoComplete="email"
          defaultValue={defaults?.email}
        />
      </label>

      <label className="form-control">
        <span className="label-text">Phone</span>
        <input
          name="phone"
          type="tel"
          className="input input-bordered"
          autoComplete="tel"
          defaultValue={defaults?.phone}
        />
      </label>

      <label className="form-control">
        <span className="label-text">Campus *</span>
        <select
          name="campusId"
          required
          className="select select-bordered"
          defaultValue={defaults?.campusId ?? ""}
        >
          <option value="">Select campus…</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          name="isFirstTimeGuest"
          value="true"
          className="checkbox"
          defaultChecked
        />
        <span className="label-text">This is my first time visiting</span>
      </label>

      <label className="form-control">
        <span className="label-text">I&apos;m interested in…</span>
        <select
          name="ministryArea"
          className="select select-bordered"
          defaultValue={defaults?.ministryArea ?? ""}
        >
          <option value="">General follow-up</option>
          {MINISTRY_AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      <label className="form-control">
        <span className="label-text">Comments</span>
        <textarea
          name="comments"
          className="textarea textarea-bordered"
          rows={3}
          defaultValue={defaults?.comments}
        />
      </label>

      {message && status === "error" && (
        <p className="text-sm text-error">{message}</p>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={status === "loading"}
      >
        {status === "loading"
          ? "Submitting…"
          : practice
            ? "Submit practice guest"
            : "Submit connect card"}
      </button>
    </form>
  );
}
