"use client";

import { useState } from "react";
import type { Campus } from "@/lib/types";

type PrayerFormProps = {
  campuses: Campus[];
};

export function PrayerForm({ campuses }: PrayerFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const res = await fetch("/api/chms/forms/prayer", {
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
    setMessage("Your prayer request has been received. Our team is praying with you.");
    e.currentTarget.reset();
  }

  if (status === "done") {
    return (
      <div className="alert alert-success">
        <span>{message}</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="form-control">
          <span className="label-text">First name *</span>
          <input name="firstName" required className="input input-bordered" />
        </label>
        <label className="form-control">
          <span className="label-text">Last name *</span>
          <input name="lastName" required className="input input-bordered" />
        </label>
      </div>

      <label className="form-control">
        <span className="label-text">Email</span>
        <input name="email" type="email" className="input input-bordered" />
      </label>

      <label className="form-control">
        <span className="label-text">Phone</span>
        <input name="phone" type="tel" className="input input-bordered" />
      </label>

      <label className="form-control">
        <span className="label-text">Campus</span>
        <select name="campusId" className="select select-bordered">
          <option value="">Not sure / Online</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="form-control">
        <span className="label-text">Prayer request *</span>
        <textarea
          name="request"
          required
          className="textarea textarea-bordered"
          rows={5}
        />
      </label>

      <label className="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          name="keepPrivate"
          value="true"
          className="checkbox"
        />
        <span className="label-text">Keep this request private (pastoral team only)</span>
      </label>

      {message && status === "error" && (
        <p className="text-sm text-error">{message}</p>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Submitting…" : "Submit prayer request"}
      </button>
    </form>
  );
}
