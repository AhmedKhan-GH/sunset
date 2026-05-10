"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  triggerManualCheckin,
  type CheckinWithPatient,
} from "@/lib/checkins/actions";

type Patient = { id: string; name: string };

export function CheckinsFeed({
  initial,
  patients,
}: {
  initial: CheckinWithPatient[];
  patients: Patient[];
}) {
  const [feed, setFeed] = useState<CheckinWithPatient[]>(initial);
  const [status, setStatus] = useState("connecting…");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session) {
        setStatus("no session");
        return;
      }
      // Critical: pin JWT to realtime client BEFORE subscribing or the
      // channel connects as anon and RLS hides every event.
      await supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel("org-checkins")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "symptom_checkins",
          },
          async (payload) => {
            const row = payload.new as Record<string, unknown>;
            // The realtime payload doesn't include the joined patient name;
            // fall back to a lookup against the patients prop.
            const patient = patients.find((p) => p.id === row.patient_id);
            const enriched: CheckinWithPatient = {
              ...(row as unknown as CheckinWithPatient),
              patient_name: patient?.name ?? "Unknown patient",
            };
            setFeed((prev) =>
              [enriched, ...prev.filter((c) => c.id !== enriched.id)].slice(0, 100),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "symptom_checkins",
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            setFeed((prev) =>
              prev.map((c) =>
                c.id === row.id
                  ? ({ ...c, ...(row as unknown as CheckinWithPatient) } as CheckinWithPatient)
                  : c,
              ),
            );
          },
        )
        .subscribe((s) => setStatus(s));
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [patients]);

  function fireManual(patientId: string) {
    setHint("");
    startTransition(async () => {
      try {
        await triggerManualCheckin(patientId);
        const p = patients.find((x) => x.id === patientId);
        setHint(`Pending check-in created for ${p?.name ?? "patient"}.`);
      } catch (e: any) {
        setHint(`Error: ${e.message ?? String(e)}`);
      }
    });
  }

  const filtered = feed.filter((c) =>
    filter === "all" ? true : c.status === filter,
  );

  return (
    <div>
      {/* Manual-trigger row */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Trigger a check-in now</h2>
          <span className="text-xs text-muted-foreground">
            channel: <code>{status}</code>
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Bypass the schedule and create a pending check-in immediately for a
          patient. They&apos;ll see it the next time they open their portal.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {patients.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={pending}
              onClick={() => fireManual(p.id)}
              className="rounded border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
            >
              {p.name}
            </button>
          ))}
          {pending && <span className="text-xs text-muted-foreground">firing…</span>}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </div>

      {/* Filter chips */}
      <div className="mt-6 flex items-center gap-2">
        {(["all", "pending", "completed"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${
              filter === f
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">
          {filtered.length} check-in{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nothing here yet. Use a button above to trigger one, or wait for
          the morning/evening cron.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((c) => (
            <CheckinCard key={c.id} c={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckinCard({ c }: { c: CheckinWithPatient }) {
  const isCompleted = c.status === "completed";
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-base font-medium">{c.patient_name}</span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
              c.scheduled_kind === "morning"
                ? "bg-amber-100 text-amber-800"
                : c.scheduled_kind === "evening"
                  ? "bg-indigo-100 text-indigo-800"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {c.scheduled_kind}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
              isCompleted
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {c.status}
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {isCompleted && c.completed_at
            ? new Date(c.completed_at).toLocaleString()
            : new Date(c.scheduled_at).toLocaleString()}
        </span>
      </div>

      {isCompleted && (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs sm:grid-cols-8">
            <ScoreCell label="Pain" value={c.pain_score} />
            <ScoreCell label="Nausea" value={c.nausea_score} />
            <ScoreCell label="SOB" value={c.shortness_of_breath_score} />
            <ScoreCell label="Anxiety" value={c.anxiety_score} />
            <ScoreCell label="Fatigue" value={c.fatigue_score} />
            <ScoreCell label="Appetite" value={c.appetite_score} hiGood />
            <ScoreCell label="Mood" value={c.mood_score} hiGood />
            <ScoreCell label="Sleep" value={c.sleep_score} hiGood />
          </div>
          {c.notes && (
            <p className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {c.notes}
            </p>
          )}
        </>
      )}
    </li>
  );
}

function ScoreCell({
  label,
  value,
  hiGood = false,
}: {
  label: string;
  value: number | null;
  hiGood?: boolean;
}) {
  const cls =
    value === null
      ? "bg-slate-100 text-slate-500"
      : hiGood
        ? value >= 7
          ? "bg-emerald-100 text-emerald-800"
          : value >= 4
            ? "bg-amber-100 text-amber-800"
            : "bg-red-100 text-red-800"
        : value >= 7
          ? "bg-red-100 text-red-800"
          : value >= 4
            ? "bg-amber-100 text-amber-800"
            : "bg-emerald-100 text-emerald-800";
  return (
    <div className={`rounded px-2 py-1 text-center font-medium ${cls}`}>
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
      <div className="font-mono text-sm">{value ?? "—"}</div>
    </div>
  );
}
