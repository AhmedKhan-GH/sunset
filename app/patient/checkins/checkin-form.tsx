"use client";

import { useState, useTransition } from "react";
import {
  submitCheckinAndRedirect,
  type SymptomScores,
} from "@/lib/checkins/actions";

const SYMPTOMS: {
  key: keyof SymptomScores;
  label: string;
  scaleHint: string;
  hiGood?: boolean;
}[] = [
  { key: "pain_score",                label: "Pain",                  scaleHint: "0 = none, 10 = worst imaginable" },
  { key: "nausea_score",              label: "Nausea",                scaleHint: "0 = none, 10 = constantly throwing up" },
  { key: "shortness_of_breath_score", label: "Shortness of breath",   scaleHint: "0 = breathing fine, 10 = can't catch breath" },
  { key: "anxiety_score",             label: "Anxiety",               scaleHint: "0 = calm, 10 = very anxious" },
  { key: "fatigue_score",             label: "Fatigue",               scaleHint: "0 = energetic, 10 = exhausted" },
  { key: "appetite_score",            label: "Appetite",              scaleHint: "0 = no appetite, 10 = eating well",      hiGood: true },
  { key: "mood_score",                label: "Mood",                  scaleHint: "0 = very low, 10 = great",                hiGood: true },
  { key: "sleep_score",               label: "Sleep quality",         scaleHint: "0 = couldn't sleep, 10 = slept very well", hiGood: true },
];

const ZERO: SymptomScores = {
  pain_score: 0,
  nausea_score: 0,
  shortness_of_breath_score: 0,
  anxiety_score: 0,
  fatigue_score: 0,
  appetite_score: 5,
  mood_score: 5,
  sleep_score: 5,
};

export function CheckinForm({ checkinId }: { checkinId: string }) {
  const [scores, setScores] = useState<SymptomScores>(ZERO);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        // Server action calls redirect() internally — Next.js processes the
        // 303 redirect, browser navigates, the transition resolves.
        await submitCheckinAndRedirect({ checkinId, scores, notes });
      } catch (e: any) {
        // NEXT_REDIRECT throws are caught by Next.js itself before reaching
        // here; only real errors land here.
        setError(e.message ?? String(e));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-5">
        {SYMPTOMS.map((s) => (
          <div key={s.key}>
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">{s.label}</label>
              <span className="font-mono text-lg font-bold tabular-nums">
                {scores[s.key]}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={scores[s.key]}
              onChange={(e) =>
                setScores((prev) => ({
                  ...prev,
                  [s.key]: Number(e.target.value),
                }))
              }
              className="mt-1 w-full"
            />
            <p className="text-xs text-muted-foreground">{s.scaleHint}</p>
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Anything else? (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. 'pain mostly in lower back', 'better after lunch'"
          className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Submitting…" : "Submit check-in"}
        </button>
      </div>
    </form>
  );
}
