"use client";

import { useState, useTransition } from "react";
import { searchNotes, keywordSearchNotes, getNotes } from "@/lib/notes/actions";
import Link from "next/link";

type Note = {
  id: string;
  patientId: string;
  patientName: string;
  authorId: string;
  content: string;
  createdAt: string;
  similarity?: number;
  filteredSimilarity?: number;
  fuzzyScore?: number;
};

type Patient = {
  id: string;
  name: string;
};

export function NotesViewer({
  initialNotes,
  patients,
  initialPatientId,
  fixedPatientId,
  userId,
  showPatientColumn,
  showPatientFilter,
  showAddForm,
  addNotePlaceholder,
  addNoteAction,
  revalidatePath: revalidate,
}: {
  initialNotes: Note[];
  patients?: Patient[];
  initialPatientId?: string;
  fixedPatientId?: string;
  userId?: string;
  showPatientColumn?: boolean;
  showPatientFilter?: boolean;
  showAddForm?: boolean;
  addNotePlaceholder?: string;
  addNoteAction?: (formData: FormData) => Promise<void>;
  revalidatePath?: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOut, setFilterOut] = useState("");
  const [fuzzy, setFuzzy] = useState("");
  const [searchMode, setSearchMode] = useState<"semantic" | "keyword">("semantic");
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId ?? "");
  const [isSearching, startSearch] = useTransition();
  const [isAdding, startAdd] = useTransition();

  const effectivePatientId = fixedPatientId ?? (selectedPatientId || undefined);

  function runSearch(query: string, filter: string, fuzzyVal: string, patientId: string | undefined, mode: "semantic" | "keyword") {
    if (!query.trim() && !(mode === "keyword" && fuzzyVal.trim())) {
      setSearchResults(null);
      return;
    }
    startSearch(async () => {
      if (mode === "keyword") {
        const results = await keywordSearchNotes(
          query,
          patientId,
          fuzzyVal.trim() ? fuzzyVal : undefined,
        );
        setSearchResults(results);
      } else {
        const results = await searchNotes(
          query,
          patientId,
          filter.trim() ? filter : undefined,
        );
        setSearchResults(results);
      }
    });
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    runSearch(query, filterOut, fuzzy, effectivePatientId, searchMode);
  }

  function handleFilterOut(filter: string) {
    setFilterOut(filter);
    if (searchQuery.trim()) {
      runSearch(searchQuery, filter, fuzzy, effectivePatientId, searchMode);
    }
  }

  function handleFuzzy(val: string) {
    setFuzzy(val);
    runSearch(searchQuery, filterOut, val, effectivePatientId, searchMode);
  }

  function handleModeToggle(mode: "semantic" | "keyword") {
    setSearchMode(mode);
    setFilterOut("");
    setFuzzy("");
    if (searchQuery.trim()) {
      runSearch(searchQuery, "", "", effectivePatientId, mode);
    }
  }

  function handlePatientFilter(patientId: string) {
    setSelectedPatientId(patientId);
    const pid = patientId || undefined;
    if (searchQuery.trim() || (searchMode === "keyword" && fuzzy.trim())) {
      runSearch(searchQuery, filterOut, fuzzy, pid, searchMode);
    } else {
      startSearch(async () => {
        const filtered = await getNotes(pid);
        setNotes(filtered);
        setSearchResults(null);
      });
    }
  }

  function handleAdd(formData: FormData) {
    if (!addNoteAction) return;
    startAdd(async () => {
      await addNoteAction(formData);
      const content = formData.get("content") as string;
      setNotes((prev) => [
        {
          id: crypto.randomUUID(),
          content,
          createdAt: new Date().toISOString(),
          patientId: fixedPatientId ?? "",
          patientName: "",
          authorId: userId ?? "",
        },
        ...prev,
      ]);
    });
  }

  function authorLabel(note: Note) {
    if (!userId) return undefined;
    return note.authorId === userId ? "You" : "Care team";
  }

  const displayNotes = searchResults ?? notes;

  return (
    <div className="flex flex-col gap-4">
      {showAddForm && addNoteAction && (
        <form action={handleAdd} className="flex flex-col gap-2">
          <textarea
            name="content"
            placeholder={addNotePlaceholder ?? "Add a note..."}
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
      )}

      {showPatientFilter && patients && (
        <select
          value={selectedPatientId}
          onChange={(e) => handlePatientFilter(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">All patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

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
        placeholder={searchMode === "semantic" ? "Include — finds notes with similar meaning" : "Exact — case-insensitive substring match"}
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="rounded border px-3 py-2 text-sm"
      />

      {searchMode === "semantic" && (
        <input
          type="text"
          placeholder="Exclude — demotes notes with similar meaning"
          value={filterOut}
          onChange={(e) => handleFilterOut(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
      )}

      {searchMode === "keyword" && (
        <input
          type="text"
          placeholder="Fuzzy — tolerates typos and misspellings"
          value={fuzzy}
          onChange={(e) => handleFuzzy(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
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
          className="self-start text-xs text-zinc-400 hover:underline"
        >
          Clear search
        </button>
      )}

      <ul className="flex flex-col gap-3">
        {displayNotes.map((note) => (
          <li key={note.id} className="rounded border px-4 py-3">
            <p className="whitespace-pre-wrap text-sm">{note.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              {showPatientColumn && (
                <Link
                  href={`/organization/patients/${note.patientId}`}
                  className="font-medium text-zinc-600 hover:underline dark:text-zinc-300"
                >
                  {note.patientName}
                </Link>
              )}
              <span>{new Date(note.createdAt).toLocaleString()}</span>
              {authorLabel(note) && <span>{authorLabel(note)}</span>}
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
    </div>
  );
}
