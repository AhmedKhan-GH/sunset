"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Checkup = {
  id: string;
  user_id: string;
  patient_name: string;
  pain_score: number | null;
  nausea_score: number | null;
  headache_score: number | null;
  fatigue_score: number | null;
  anxiety_score: number | null;
  shortness_of_breath_score: number | null;
  notes: string | null;
  created_at: string;
};

const SYMPTOMS: { key: keyof Checkup; label: string }[] = [
  { key: "pain_score",                label: "Pain" },
  { key: "nausea_score",              label: "Nausea" },
  { key: "headache_score",            label: "Headache" },
  { key: "fatigue_score",             label: "Fatigue" },
  { key: "anxiety_score",             label: "Anxiety" },
  { key: "shortness_of_breath_score", label: "SOB" },
];

function scoreColor(score: number | null) {
  if (score === null || score === undefined) return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  if (score >= 8) return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
  if (score >= 5) return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  if (score >= 2) return "bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200";
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
}

export function CheckupsFeed({ initial }: { initial: Checkup[] }) {
  const [feed, setFeed] = useState<Checkup[]>(initial);
  const [status, setStatus] = useState<string>("connecting…");

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
        .channel("clinician-patient-checkups")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "patient_checkups" },
          (payload) => {
            const row = payload.new as Checkup;
            setFeed((prev) =>
              [row, ...prev.filter((r) => r.id !== row.id)],
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

  return (
    <div>
      <p className="mb-4 text-xs text-zinc-400">
        Channel: <code>{status}</code> · {feed.length} checkup{feed.length === 1 ? "" : "s"}
      </p>

      {feed.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No checkups yet. When a patient submits via /caregiver, they appear
          here without a refresh.
        </p>
      ) : (
        <ul className="space-y-3">
          {feed.map((c) => (
            <li key={c.id} className="rounded border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.patient_name}</span>
                <span className="font-mono text-xs text-zinc-400">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {SYMPTOMS.map((s) => {
                  const v = c[s.key] as number | null;
                  return (
                    <span
                      key={s.key}
                      className={`rounded px-2 py-1 text-xs font-medium ${scoreColor(v)}`}
                    >
                      {s.label}: {v ?? "–"}
                    </span>
                  );
                })}
              </div>

              {c.notes && (
                <p className="mt-3 rounded bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">
                  {c.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
