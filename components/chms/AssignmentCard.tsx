"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ASSIGNMENT_STATUS_LABELS,
  CONTACT_TYPES,
  GUEST_CONTACT_TEMPLATE,
  ministryAreaLabel,
} from "@/lib/chms/constants";
import type { ChmsAssignment, ChmsAssignmentNote } from "@/lib/chms/types";

type StaffOption = { id: string; display_name: string | null };

type AssignmentCardProps = {
  assignment: ChmsAssignment;
  notes: ChmsAssignmentNote[];
  staff: StaffOption[];
  canManage: boolean;
  currentUserId: string;
  nextQueues: Array<{ id: string; label: string }>;
};

function formatDue(dueAt: string | null): string {
  if (!dueAt) return "No due date";
  const due = new Date(dueAt);
  const now = new Date();
  const overdue = due < now;
  return `${overdue ? "Overdue · " : ""}${due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function AssignmentCard({
  assignment,
  notes,
  staff,
  canManage,
  currentUserId,
  nextQueues,
}: AssignmentCardProps) {
  const [noteBody, setNoteBody] = useState("");
  const [contactType, setContactType] = useState("call");
  const [completeNote, setCompleteNote] = useState("");
  const [nextQueueId, setNextQueueId] = useState(
    nextQueues.find((q) => q.label.includes("Group"))?.id ??
      nextQueues[0]?.id ??
      ""
  );
  const [assignTo, setAssignTo] = useState(assignment.assigned_to ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const person = assignment.person!;
  const queue = assignment.queue!;
  const fullName = `${person.first_name} ${person.last_name}`;

  const template = GUEST_CONTACT_TEMPLATE.replace(
    "{firstName}",
    person.first_name
  ).replace("{staffName}", "Community Church");

  async function post(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    window.location.reload();
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href={`/chms/people/${person.id}`}
              className="text-lg font-semibold link link-hover"
            >
              {fullName}
            </Link>
            <p className="text-sm text-base-content/60">
              {queue.name} · {queue.process?.name}
            </p>
            <p className="text-xs text-base-content/50 mt-1">
              {ministryAreaLabel(assignment.ministry_area)} ·{" "}
              {assignment.campus?.name ?? person.campus?.name ?? "No campus"} ·{" "}
              {formatDue(assignment.due_at)}
            </p>
          </div>
          <span className="badge badge-outline">
            {ASSIGNMENT_STATUS_LABELS[assignment.status]}
          </span>
        </div>

        {queue.instructions && (
          <div className="rounded-lg bg-base-200/60 p-3 text-sm">
            <p className="font-medium text-xs uppercase tracking-wide text-base-content/50 mb-1">
              Instructions
            </p>
            <p>{queue.instructions}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          {person.email && (
            <a className="link" href={`mailto:${person.email}`}>
              {person.email}
            </a>
          )}
          {person.phone && (
            <a className="link" href={`tel:${person.phone}`}>
              {person.phone}
            </a>
          )}
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Message template</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-base-200 p-3 text-xs">
            {template}
          </pre>
        </details>

        {canManage && !assignment.assigned_to && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="form-control flex-1 min-w-[12rem]">
              <span className="label-text text-xs">Assign manager</span>
              <select
                className="select select-bordered select-sm"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
              >
                <option value="">Select staff…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name ?? s.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!assignTo || busy}
              onClick={() =>
                post(`/api/chms/assignments/${assignment.id}/assign`, {
                  managerId: assignTo,
                })
              }
            >
              Assign
            </button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
            Log contact
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              className="select select-bordered select-sm"
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
            >
              {CONTACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              className="input input-bordered input-sm flex-1 min-w-[12rem]"
              placeholder="What happened?"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={!noteBody.trim() || busy}
              onClick={() =>
                post(`/api/chms/assignments/${assignment.id}/notes`, {
                  body: noteBody,
                  contactType,
                })
              }
            >
              Log
            </button>
          </div>
        </div>

        {notes.length > 0 && (
          <ul className="space-y-2 text-sm">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-base-300 p-2">
                <p className="text-xs text-base-content/50">
                  {n.author?.display_name ?? "Staff"}
                  {n.contact_type ? ` · ${n.contact_type}` : ""} ·{" "}
                  {new Date(n.created_at).toLocaleString()}
                </p>
                <p>{n.body}</p>
              </li>
            ))}
          </ul>
        )}

        {(assignment.assigned_to === currentUserId || canManage) &&
          assignment.status !== "done" && (
            <div className="border-t border-base-300 pt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
                Mark done (note required)
              </p>
              {nextQueues.length > 1 && (
                <select
                  className="select select-bordered select-sm w-full"
                  value={nextQueueId}
                  onChange={(e) => setNextQueueId(e.target.value)}
                >
                  {nextQueues.map((q) => (
                    <option key={q.id} value={q.id}>
                      Next: {q.label}
                    </option>
                  ))}
                </select>
              )}
              <textarea
                className="textarea textarea-bordered w-full text-sm"
                rows={3}
                placeholder="Required completion note…"
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-success btn-sm"
                disabled={!completeNote.trim() || busy}
                onClick={() =>
                  post(`/api/chms/assignments/${assignment.id}/complete`, {
                    note: completeNote,
                    nextQueueId: nextQueueId || undefined,
                  }).catch((e: Error) => setError(e.message))
                }
              >
                Mark done &amp; advance
              </button>
            </div>
          )}

        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    </div>
  );
}
