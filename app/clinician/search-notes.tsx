"use client";

import { useState, useTransition } from "react";
import { searchNotes, type NoteResult } from "./actions";

const EXAMPLES = [
  "patient hasn't been able to keep food down",
  "trouble breathing when lying flat",
  "abdomen feels distended",
  "won't stop pacing the room",
  "high temperature with chills",
];

export function SearchNotes() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NoteResult[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  function runSearch(q: string) {
    setError("");
    setSubmittedQuery(q);
    startTransition(async () => {
      try {
        const r = await searchNotes(q);
        setResults(r);
      } catch (e: any) {
        setError(e.message ?? String(e));
        setResults([]);
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    runSearch(query);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what you're looking for..."
          className="flex-1 rounded border px-3 py-2"
          autoFocus
        />
        <button
          type="submit"
          disabled={pending || !query.trim()}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-zinc-400">try:</span>
        {EXAMPLES.map((e) => (
          <button
            key={e}
            onClick={() => {
              setQuery(e);
              runSearch(e);
            }}
            className="rounded-full border px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {e}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {submittedQuery && !pending && results.length === 0 && !error && (
        <p className="mt-6 text-sm text-zinc-400">
          No results for &ldquo;{submittedQuery}&rdquo;.
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-zinc-500">
            {results.length} most semantically similar notes for &ldquo;
            {submittedQuery}&rdquo;
          </p>
          <ul className="mt-3 space-y-2">
            {results.map((r) => (
              <li
                key={r.id}
                className="rounded border px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                    {r.category}
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    sim={r.similarity.toFixed(3)}
                  </span>
                </div>
                <p className="mt-2 text-sm">{r.symptom_text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
