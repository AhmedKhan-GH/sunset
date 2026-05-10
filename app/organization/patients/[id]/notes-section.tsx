"use client";

import { useState, useTransition } from "react";
import { searchPatientNotes, keywordSearchPatientNotes } from "./notes-actions";

type Note = {
  id: string;
  content: string;
  createdAt: string;
  authorId?: string;
  authorName?: string;
  similarity?: number;
  filteredSimilarity?: number;
  fuzzyScore?: number;
};

export function NotesSection({
  patientId,
  initialNotes,
  addNoteAction,
}: {
  patientId: string;
  initialNotes: Note[];
  addNoteAction: (formData: FormData) => Promise<void>;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOut, setFilterOut] = useState("");
  const [fuzzy, setFuzzy] = useState("");
  const [searchMode, setSearchMode] = useState<"semantic" | "keyword">("semantic");
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isAdding, startAdd] = useTransition();

  function runSearch(query: string, filter: string, fuzzyVal: string, mode: "semantic" | "keyword") {
    if (!query.trim() && !(mode === "keyword" && fuzzyVal.trim())) {
      setSearchResults(null);
      return;
    }
    startSearch(async () => {
      if (mode === "keyword") {
        const results = await keywordSearchPatientNotes(
          patientId,
          query,
          fuzzyVal.trim() ? fuzzyVal : undefined,
        );
        setSearchResults(results);
      } else {
        const results = await searchPatientNotes(patientId, query, filter.trim() ? filter : undefined);
        setSearchResults(results);
      }
    });
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    runSearch(query, filterOut, fuzzy, searchMode);
  }

  function handleFilterOut(filter: string) {
    setFilterOut(filter);
    if (searchQuery.trim()) {
      runSearch(searchQuery, filter, fuzzy, searchMode);
    }
  }

  function handleFuzzy(val: string) {
    setFuzzy(val);
    runSearch(searchQuery, filterOut, val, searchMode);
  }

  function handleModeToggle(mode: "semantic" | "keyword") {
    setSearchMode(mode);
    setFilterOut("");
    setFuzzy("");
    if (searchQuery.trim()) {
      runSearch(searchQuery, "", "", mode);
    }
  }

  function handleAdd(formData: FormData) {
    startAdd(async () => {
      await addNoteAction(formData);
      const content = formData.get("content") as string;
      setNotes((prev) => [
        {
          id: crypto.randomUUID(),
          content,
          createdAt: new Date().toISOString(),
          authorName: "You",
        },
        ...prev,
      ]);
    });
  }

  const displayNotes = searchResults ?? notes;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Notes</h2>

      <form action={handleAdd} className="mt-4 flex flex-col gap-2">
        <textarea
          name="content"
          placeholder="Add a clinical note..."
          required
          rows={3}
          className="rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={isAdding}
          className="self-end rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isAdding ? "Saving..." : "Add note"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2">
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => handleModeToggle("semantic")}
            className={`rounded px-3 py-1 ${searchMode === "semantic" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-zinc-100 dark:bg-zinc-800"}`}
          >
            Semantic
          </button>
          <button
            onClick={() => handleModeToggle("keyword")}
            className={`rounded px-3 py-1 ${searchMode === "keyword" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-zinc-100 dark:bg-zinc-800"}`}
          >
            Keyword
          </button>
        </div>
        <input
          type="text"
          placeholder={searchMode === "semantic" ? "Search notes semantically..." : "Exact keyword match (case-insensitive)..."}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        {searchMode === "semantic" && (
          <input
            type="text"
            placeholder="Filter out (e.g. 'morning routine')..."
            value={filterOut}
            onChange={(e) => handleFilterOut(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        )}
        {searchMode === "keyword" && (
          <input
            type="text"
            placeholder="Fuzzy match (tolerates typos, e.g. 'morpine' finds 'morphine')..."
            value={fuzzy}
            onChange={(e) => handleFuzzy(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        )}
        {isSearching && (
          <p className="text-xs text-zinc-400">Searching...</p>
        )}
        {searchResults && (
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterOut("");
              setFuzzy("");
              setSearchResults(null);
            }}
            className="text-xs text-zinc-400 hover:underline self-start"
          >
            Clear search
          </button>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {displayNotes.map((note) => (
          <li key={note.id} className="rounded border px-4 py-3">
            <p className="whitespace-pre-wrap text-sm">{note.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span>{new Date(note.createdAt).toLocaleString()}</span>
              {note.authorName && <span>{note.authorName}</span>}
              {note.similarity != null && (
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                  {(note.similarity * 100).toFixed(0)}% match
                </span>
              )}
              {note.filteredSimilarity != null && (
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {(note.filteredSimilarity * 100).toFixed(0)}% filter
                </span>
              )}
              {note.fuzzyScore != null && (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {(note.fuzzyScore * 100).toFixed(0)}% fuzzy
                </span>
              )}
            </div>
          </li>
        ))}
        {displayNotes.length === 0 && (
          <li className="text-sm text-zinc-400">
            {searchResults ? "No matching notes." : "No notes yet."}
          </li>
        )}
      </ul>
    </section>
  );
}
