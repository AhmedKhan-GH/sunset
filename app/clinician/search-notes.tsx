"use client";

import { useState, useEffect, useTransition } from "react";
import { searchNotes, type NoteResult } from "./actions";

const EXAMPLES = [
  "patient hasn't been able to keep food down",
  "trouble breathing when lying flat",
  "abdomen feels distended",
  "won't stop pacing the room",
  "high temperature with chills",
];

const DEBOUNCE_MS = 1000;

export function SearchNotes() {
  const [query, setQuery] = useState("");
  const [filterOut, setFilterOut] = useState("");
  const [results, setResults] = useState<NoteResult[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function runSearch(q: string, f: string) {
    const tq = q.trim();
    const tf = f.trim();
    if (!tq) {
      setResults([]);
      setActiveQuery("");
      setActiveFilter("");
      setError("");
      return;
    }
    setError("");
    setActiveQuery(tq);
    setActiveFilter(tf);
    startTransition(async () => {
      try {
        const r = await searchNotes(tq, tf || undefined);
        setResults(r);
      } catch (e: any) {
        setError(e.message ?? String(e));
        setResults([]);
      }
    });
  }

  // Debounced live search — fires 1s after either field stops changing.
  useEffect(() => {
    const tq = query.trim();
    const tf = filterOut.trim();
    if (!tq) {
      setResults([]);
      setActiveQuery("");
      setActiveFilter("");
      return;
    }
    if (tq === activeQuery && tf === activeFilter) return;
    const t = setTimeout(() => runSearch(query, filterOut), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filterOut]);

  const filterActive = activeFilter.length > 0;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="space-y-3"
      >
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
            Search
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you're looking for..."
            className="mt-1 w-full rounded border px-3 py-2"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
            Filter out{" "}
            <span className="font-normal lowercase tracking-normal text-zinc-400">
              (optional — deboosts results similar to this)
            </span>
          </label>
          <input
            value={filterOut}
            onChange={(e) => setFilterOut(e.target.value)}
            placeholder="e.g. 'morning routine' to filter out morning observations"
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-400">try:</span>
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setQuery(e)}
            className="rounded-full border px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {e}
          </button>
        ))}
        {pending && <span className="text-xs text-zinc-400">searching…</span>}
      </div>

      {error && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {activeQuery && !pending && results.length === 0 && !error && (
        <p className="mt-6 text-sm text-zinc-400">
          No results for &ldquo;{activeQuery}&rdquo;.
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-zinc-500">
            {results.length} most similar to &ldquo;{activeQuery}&rdquo;
            {filterActive && (
              <>
                , filtering out &ldquo;{activeFilter}&rdquo;
              </>
            )}
          </p>
          <ul className="mt-3 space-y-2">
            {results.map((r) => (
              <li key={r.id} className="rounded border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                    {r.category}
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    sim={r.similarity.toFixed(3)}
                    {filterActive && r.filtered_similarity !== undefined && (
                      <>
                        {" "}
                        <span className="text-zinc-500">
                          ·  filter-sim={r.filtered_similarity.toFixed(3)}
                        </span>
                      </>
                    )}
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
