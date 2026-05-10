"use client";

import { useState, useTransition } from "react";
import {
  updateMyCheckinSchedule,
  type CheckinSchedule,
} from "@/lib/checkins/actions";

// Convert a UTC "HH:MM" string into the same instant in the user's local
// timezone, also "HH:MM". Just for display purposes — round-trips cleanly.
function utcToLocalHHMM(utcHHMM: string): string {
  const [h, m] = utcHHMM.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function localHHMMToUtc(localHHMM: string): string {
  const [h, m] = localHHMM.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function ScheduleSettings({ initial }: { initial: CheckinSchedule }) {
  const [morningLocal, setMorningLocal] = useState(
    utcToLocalHHMM(initial.morning_checkin_time),
  );
  const [eveningLocal, setEveningLocal] = useState(
    utcToLocalHHMM(initial.evening_checkin_time),
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError("");
    startTransition(async () => {
      try {
        await updateMyCheckinSchedule({
          morning_checkin_time: localHHMMToUtc(morningLocal),
          evening_checkin_time: localHHMMToUtc(eveningLocal),
        });
        setSaved(true);
      } catch (e: any) {
        setError(e.message ?? String(e));
      }
    });
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Check-in times</h3>
        <span className="text-[10px] text-muted-foreground">
          Times are in your local timezone ({tz})
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        We&apos;ll send a check-in twice a day at these times. Match them to
        whenever fits your routine — after breakfast and before bed are common.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Morning
          </span>
          <input
            type="time"
            value={morningLocal}
            onChange={(e) => setMorningLocal(e.target.value)}
            required
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Evening
          </span>
          <input
            type="time"
            value={eveningLocal}
            onChange={(e) => setEveningLocal(e.target.value)}
            required
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {saved && "Saved."}
        </span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save times"}
        </button>
      </div>
    </form>
  );
}
