"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { triggerCheckin, type Checkin } from "./actions";

const MAX_VISIBLE = 7;

export function CheckinsFeed({ initial }: { initial: Checkin[] }) {
  const [feed, setFeed] = useState<Checkin[]>(initial.slice(0, MAX_VISIBLE));
  const [status, setStatus] = useState<string>("connecting…");
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState<string>("");

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
      await supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel("clinician-checkins")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "patient_checkins" },
          (payload) => {
            const row = payload.new as Checkin;
            setFeed((prev) =>
              [row, ...prev.filter((r) => r.id !== row.id)].slice(0, MAX_VISIBLE),
            );
          },
        )
        .subscribe((s) => setStatus(s));
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  function fire(type: "morning" | "evening") {
    setHint("");
    startTransition(async () => {
      try {
        const r = await triggerCheckin(type);
        setHint(`Inserted ${r.inserted} ${type} check-in${r.inserted === 1 ? "" : "s"}.`);
      } catch (e: any) {
        setHint(`Error: ${e.message ?? String(e)}`);
      }
    });
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Recent patient check-ins</h2>
        <span className="text-xs text-zinc-400">
          channel: <code>{status}</code>
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Top {MAX_VISIBLE} most recent. Updates live via realtime when the
        morning (8 AM PDT) or evening (8 PM PDT) cron fires.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fire("morning")}
          disabled={pending}
          className="rounded border px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-900"
        >
          Trigger morning check-in
        </button>
        <button
          type="button"
          onClick={() => fire("evening")}
          disabled={pending}
          className="rounded border px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-900"
        >
          Trigger evening check-in
        </button>
        {pending && <span className="text-xs text-zinc-400">firing…</span>}
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>

      {feed.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">
          No check-ins yet. Fire one with the buttons above to see realtime in
          action.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {feed.map((c) => (
            <li key={c.id} className="rounded border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.patient_name}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      c.checkin_type === "morning"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                        : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                    }`}
                  >
                    {c.checkin_type}
                  </span>
                  {c.symptom_category && (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                      {c.symptom_category}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-zinc-400">
                  {new Date(c.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-2 text-sm">{c.symptom_text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
