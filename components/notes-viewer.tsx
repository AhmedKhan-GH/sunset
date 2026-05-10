"use client";

import { useState, useTransition, useCallback } from "react";
import { searchNotes, keywordSearchNotes, getNotes } from "@/lib/notes/actions";
import { useRealtimeNotes } from "@/lib/supabase/use-realtime-notes";
import Link from "next/link";

type Note = {
  id: string;
  patientId: string;
  patientName: string;
  authorId: string;
  authorName?: string | null;
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

type ViewMode = "semantic" | "keyword" | "newest" | "oldest";

export function NotesViewer({
  initialNotes,
  patients,
  initialPatientId,
  fixedPatientId,
  userId,
  organizationId,
  showPatientColumn,
  showPatientFilter,
  showAddForm,
  addNotePlaceholder,
  addNoteAction,
}: {
  initialNotes: Note[];
  patients?: Patient[];
  initialPatientId?: string;
  fixedPatientId?: string;
  userId?: string;
  organizationId?: string;
  showPatientColumn?: boolean;
  showPatientFilter?: boolean;
  showAddForm?: boolean;
  addNotePlaceholder?: string;
  addNoteAction?: (formData: FormData) => Promise<void>;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOut, setFilterOut] = useState("");
  const [fuzzy, setFuzzy] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("newest");
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId ?? "");
  const [isSearching, startSearch] = useTransition();
  const [, startLoad] = useTransition();
  const [isAdding, startAdd] = useTransition();

  const effectivePatientId = fixedPatientId ?? (selectedPatientId || undefined);

  const handleRealtimeInsert = useCallback(
    () => {
      getNotes(effectivePatientId).then((fresh) => {
        setNotes(fresh);
      });
    },
    [effectivePatientId],
  );

  useRealtimeNotes(organizationId ?? "", handleRealtimeInsert);

  function runSearch(query: string, filter: string, fuzzyVal: string, patientId: string | undefined, mode: ViewMode) {
    if (mode === "newest" || mode === "oldest") {
      setSearchResults(null);
      return;
    }
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
    runSearch(query, filterOut, fuzzy, effectivePatientId, viewMode);
  }

  function handleFilterOut(filter: string) {
    setFilterOut(filter);
    if (searchQuery.trim()) {
      runSearch(searchQuery, filter, fuzzy, effectivePatientId, viewMode);
    }
  }

  function handleFuzzy(val: string) {
    setFuzzy(val);
    runSearch(searchQuery, filterOut, val, effectivePatientId, viewMode);
  }

  function handleModeToggle(mode: ViewMode) {
    setViewMode(mode);
    setFilterOut("");
    setFuzzy("");
    setSearchQuery("");
    setSearchResults(null);
    if (mode === "newest" || mode === "oldest") {
      startLoad(async () => {
        const fetched = await getNotes(effectivePatientId);
        setNotes(fetched);
      });
    }
  }

  function handlePatientFilter(patientId: string) {
    setSelectedPatientId(patientId);
    const pid = patientId || undefined;
    if ((viewMode === "semantic" || viewMode === "keyword") && (searchQuery.trim() || (viewMode === "keyword" && fuzzy.trim()))) {
      runSearch(searchQuery, filterOut, fuzzy, pid, viewMode);
    } else {
      startLoad(async () => {
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


  const displayNotes = (() => {
    const source = searchResults ?? notes;
    if (viewMode === "oldest") {
      return [...source].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    if (viewMode === "newest") {
      return [...source].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return source;
  })();

  const isSearchMode = viewMode === "semantic" || viewMode === "keyword";

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

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(["newest", "oldest", "semantic", "keyword"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeToggle(mode)}
            className={`rounded px-3 py-1 capitalize ${viewMode === mode ? "bg-black text-white dark:bg-white dark:text-black" : "bg-zinc-100 dark:bg-zinc-800"}`}
          >
            {mode}
          </button>
        ))}
        {showPatientFilter && patients && (
          <select
            value={selectedPatientId}
            onChange={(e) => handlePatientFilter(e.target.value)}
            className="ml-auto rounded border px-3 py-1.5 text-sm"
          >
            <option value="">All patients</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {isSearchMode && (
        <>
          <input
            type="text"
            placeholder={viewMode === "semantic" ? "Include — finds notes with similar meaning" : "Exact — case-insensitive substring match"}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />

          {viewMode === "semantic" && (
            <input
              type="text"
              placeholder="Exclude — demotes notes with similar meaning"
              value={filterOut}
              onChange={(e) => handleFilterOut(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
          )}

          {viewMode === "keyword" && (
            <input
              type="text"
              placeholder="Fuzzy — tolerates typos and misspellings"
              value={fuzzy}
              onChange={(e) => handleFuzzy(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
          )}
        </>
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
              {note.patientName && (
                <span>
                  <span className="text-zinc-500">for </span>
                  {showPatientColumn ? (
                    <Link
                      href={`/organization/patients/${note.patientId}`}
                      className="font-medium text-zinc-600 hover:underline dark:text-zinc-300"
                    >
                      {note.patientName}
                    </Link>
                  ) : (
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">{note.patientName}</span>
                  )}
                </span>
              )}
              {note.authorName && (
                <span>
                  <span className="text-zinc-500">by </span>
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">{note.authorName}</span>
                </span>
              )}
              <span>{new Date(note.createdAt).toLocaleString()}</span>
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
