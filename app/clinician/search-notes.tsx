"use client";

import { useState, useEffect, useTransition } from "react";
import { searchNotes, type NoteResult, type SearchMode } from "./actions";

const EXAMPLES = [
  "patient hasn't been able to keep food down",
  "trouble breathing when lying flat",
  "abdomen feels distended",
  "won't stop pacing the room",
  "high temperature with chills",
];

const DEBOUNCE_MS = 1000;

type FieldState = {
  query: string;
  setQuery: (s: string) => void;
  results: NoteResult[];
  activeQuery: string;
  pending: boolean;
  error: string;
};

function useSearchField(mode: SearchMode): FieldState {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NoteResult[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setActiveQuery("");
      setError("");
      return;
    }
    setError("");
    setActiveQuery(trimmed);
    startTransition(async () => {
      try {
        const r = await searchNotes(trimmed, mode);
        setResults(r);
      } catch (e: any) {
        setError(e.message ?? String(e));
        setResults([]);
      }
    });
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setActiveQuery("");
      return;
    }
    if (trimmed === activeQuery) return;
    const t = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return { query, setQuery, results, activeQuery, pending, error };
}

function ResultsList({
  results,
  activeQuery,
  pending,
  error,
  emptyHint,
  scoreLabel,
}: {
  results: NoteResult[];
  activeQuery: string;
  pending: boolean;
  error: string;
  emptyHint: string;
  scoreLabel: string;
}) {
  if (error) {
    return (
      <p className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
        {error}
      </p>
    );
  }
  if (activeQuery && !pending && results.length === 0) {
    return (
      <p className="mt-6 text-sm text-zinc-400">
        No results for &ldquo;{activeQuery}&rdquo;.
      </p>
    );
  }
  if (results.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs text-zinc-500">
        {results.length} {emptyHint} for &ldquo;{activeQuery}&rdquo;
      </p>
      <ul className="mt-3 space-y-2">
        {results.map((r) => (
          <li key={r.id} className="rounded border px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                {r.category}
              </span>
              <span className="font-mono text-xs text-zinc-400">
                {scoreLabel}={r.similarity.toFixed(3)}
              </span>
            </div>
            <p className="mt-2 text-sm">{r.symptom_text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SearchNotes() {
  const positive = useSearchField("most_similar");
  const negative = useSearchField("least_similar");

  return (
    <div className="space-y-12">
      {/* ── Positive (most-similar) search ───────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
            Most similar
          </h2>
          {positive.pending && (
            <span className="text-xs text-zinc-400">searching…</span>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Find recordings that match in meaning, even with different words.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={positive.query}
            onChange={(e) => positive.setQuery(e.target.value)}
            placeholder="Describe what you're looking for..."
            className="flex-1 rounded border px-3 py-2"
            autoFocus
          />
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-400">try:</span>
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => positive.setQuery(e)}
              className="rounded-full border px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {e}
            </button>
          ))}
        </div>

        <ResultsList
          {...positive}
          emptyHint="most semantically similar notes"
          scoreLabel="sim"
        />
      </section>

      {/* ── Negative (least-similar) search ──────────────────────────── */}
      <section className="border-t pt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
            Least similar
          </h2>
          {negative.pending && (
            <span className="text-xs text-zinc-400">searching…</span>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Surface recordings <em>least</em> related to the query. Useful for
          contrast (&ldquo;everything else this patient has been through&rdquo;)
          or sanity-checking what the search considers far apart.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={negative.query}
            onChange={(e) => negative.setQuery(e.target.value)}
            placeholder="Find notes farthest from this concept..."
            className="flex-1 rounded border px-3 py-2"
          />
        </form>

        <ResultsList
          {...negative}
          emptyHint="least semantically similar notes"
          scoreLabel="sim"
        />
      </section>
    </div>
  );
}
