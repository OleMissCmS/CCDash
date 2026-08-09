"use client";

import { useState } from "react";

type AttendanceSyncResponse = {
  ok?: boolean;
  error?: string;
  sundayCount?: number;
  monthlyCount?: number;
  annualCount?: number;
  dateRange?: { start: string; end: string } | null;
};

type GivingSyncResponse = {
  ok?: boolean;
  error?: string;
  monthCount?: number;
  snapshotCount?: number;
  dateRange?: { start: string; end: string } | null;
};

export function DataSyncPanel() {
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [givingLoading, setGivingLoading] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(
    null
  );
  const [givingMessage, setGivingMessage] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [givingError, setGivingError] = useState<string | null>(null);

  async function syncAttendance() {
    setAttendanceLoading(true);
    setAttendanceMessage(null);
    setAttendanceError(null);

    try {
      const response = await fetch("/api/admin/sync-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as AttendanceSyncResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Attendance sync failed");
      }

      const range = data.dateRange
        ? `${data.dateRange.start} to ${data.dateRange.end}`
        : "no dates";

      setAttendanceMessage(
        `Synced ${data.sundayCount ?? 0} Sundays (${range}).`
      );
    } catch (syncError) {
      setAttendanceError(
        syncError instanceof Error ? syncError.message : "Attendance sync failed"
      );
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function syncGiving() {
    setGivingLoading(true);
    setGivingMessage(null);
    setGivingError(null);

    try {
      const response = await fetch("/api/admin/sync-giving", {
        method: "POST",
      });

      const data = (await response.json()) as GivingSyncResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Giving sync failed");
      }

      const range = data.dateRange
        ? `${data.dateRange.start} to ${data.dateRange.end}`
        : "no dates";

      setGivingMessage(
        `Synced ${data.monthCount ?? 0} months (${range}) into ${data.snapshotCount ?? 0} records.`
      );
    } catch (syncError) {
      setGivingError(
        syncError instanceof Error ? syncError.message : "Giving sync failed"
      );
    } finally {
      setGivingLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <h2 className="text-lg font-semibold">Sunday attendance sync</h2>
        <p className="mt-1 text-sm text-base-content/70">
          Pulls from the attendance Google Sheet. Auto-runs every Tuesday at
          2:00 PM Eastern when deployed to Vercel.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={syncAttendance}
            disabled={attendanceLoading || givingLoading}
          >
            {attendanceLoading ? "Syncing…" : "Sync attendance"}
          </button>
          {attendanceMessage && (
            <p className="text-sm text-success">{attendanceMessage}</p>
          )}
          {attendanceError && (
            <p className="text-sm text-error">{attendanceError}</p>
          )}
        </div>
      </div>

      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <h2 className="text-lg font-semibold">Giving & expenses sync</h2>
        <p className="mt-1 text-sm text-base-content/70">
          Pulls monthly giving, giving households, general fund expenses, and
          campus giving from the stewardship Google Sheet. Auto-runs on the
          Monday before the second Tuesday of each month (after reconciliation).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={syncGiving}
            disabled={attendanceLoading || givingLoading}
          >
            {givingLoading ? "Syncing…" : "Sync giving"}
          </button>
          {givingMessage && (
            <p className="text-sm text-success">{givingMessage}</p>
          )}
          {givingError && (
            <p className="text-sm text-error">{givingError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
