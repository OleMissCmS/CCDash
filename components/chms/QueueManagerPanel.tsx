"use client";

import { useState } from "react";

type StaffOption = { id: string; display_name: string | null };

type QueueManagerPanelProps = {
  queueId: string;
  staff: StaffOption[];
  currentManagerIds: string[];
};

export function QueueManagerPanel({
  queueId,
  staff,
  currentManagerIds,
}: QueueManagerPanelProps) {
  const [selected, setSelected] = useState<string[]>(currentManagerIds);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/chms/queues/${queueId}/managers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerIds: selected }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Failed to save");
      return;
    }
    setMessage("Queue managers updated.");
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-3">
        <div>
          <h3 className="font-semibold text-sm">Queue managers</h3>
          <p className="text-xs text-base-content/60">
            Notified when someone enters this queue. Coordinators assign staff to
            individual guests from each card.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {staff.map((s) => (
            <label
              key={s.id}
              className="label cursor-pointer justify-start gap-3 py-1"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
              />
              <span className="label-text">
                {s.display_name ?? s.id.slice(0, 8)}
              </span>
            </label>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm w-fit"
          disabled={busy}
          onClick={save}
        >
          Save managers
        </button>
        {message && <p className="text-xs text-base-content/70">{message}</p>}
      </div>
    </div>
  );
}
