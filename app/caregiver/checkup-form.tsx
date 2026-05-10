"use client";

import { useState, useTransition } from "react";
import { submitCheckup } from "./actions";

const SYMPTOMS = [
  { key: "pain_score",                label: "Body pain",         hint: "0 = none, 10 = worst imaginable" },
  { key: "nausea_score",              label: "Nausea",            hint: "0 = none, 10 = constantly throwing up" },
  { key: "headache_score",            label: "Headache",          hint: "0 = none, 10 = severe" },
  { key: "fatigue_score",             label: "Fatigue",           hint: "0 = energetic, 10 = exhausted" },
  { key: "anxiety_score",             label: "Anxiety",           hint: "0 = calm, 10 = very anxious" },
  { key: "shortness_of_breath_score", label: "Shortness of breath", hint: "0 = breathing fine, 10 = can't catch breath" },
] as const;

type SymKey = (typeof SYMPTOMS)[number]["key"];
type Scores = Record<SymKey, number>;

const ZERO_SCORES: Scores = {
  pain_score: 0,
  nausea_score: 0,
  headache_score: 0,
  fatigue_score: 0,
  anxiety_score: 0,
  shortness_of_breath_score: 0,
};

export function CheckupForm({ defaultName }: { defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [scores, setScores] = useState<Scores>(ZERO_SCORES);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setScores(ZERO_SCORES);
    setNotes("");
    setError("");
    setSuccess(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    startTransition(async () => {
      try {
        await submitCheckup({
          patient_name: name,
          ...scores,
          notes,
        });
        setSuccess(true);
        setScores(ZERO_SCORES);
        setNotes("");
      } catch (e: any) {
        setError(e.message ?? String(e));
      }
    });
  }

  if (!open) {
    return (
      <div>
        <button
          onClick={() => {
            reset();
            setOpen(true);
          }}
          className="rounded bg-black px-6 py-3 text-white hover:opacity-90 dark:bg-white dark:text-black"
        >
          Start a checkup
        </button>
        {success && (
          <p className="mt-4 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200">
            Checkup submitted. Your nurse can see it now.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
          Patient name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>

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
                setScores((prev) => ({ ...prev, [s.key]: Number(e.target.value) }))
              }
              className="mt-1 w-full"
            />
            <p className="text-xs text-zinc-500">{s.hint}</p>
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
          Anything else? (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. 'pain mostly in my lower back', 'feeling worse after lunch'"
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-6 py-2 text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Submitting…" : "Submit checkup"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="rounded border px-6 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
