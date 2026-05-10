"use client";

import { useState, useTransition } from "react";
import { searchLinkedPatientNotes } from "./actions";

type Note = {
  id: string;
  content: string;
  createdAt: string;
  isOwnNote: boolean;
  similarity?: number;
};

export function RelativeNotes({
  initialNotes,
  patientName,
  addNoteAction,
}: {
  initialNotes: Note[];
  patientName: string;
  addNoteAction: (formData: FormData) => Promise<void>;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isAdding, startAdd] = useTransition();

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    startSearch(async () => {
      const results = await searchLinkedPatientNotes(query);
      setSearchResults(results);
    });
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
          isOwnNote: true,
        },
        ...prev,
      ]);
    });
  }

  const displayNotes = searchResults ?? notes;

  return (
    <div className="flex flex-col gap-6">
      <form action={handleAdd} className="flex flex-col gap-2">
        <textarea
          name="content"
          placeholder={`Add an observation about ${patientName}...`}
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

      <div>
        <input
          type="text"
          placeholder={`Search notes about ${patientName}...`}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        {isSearching && (
          <p className="mt-1 text-xs text-zinc-400">Searching...</p>
        )}
        {searchResults && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSearchResults(null);
            }}
            className="mt-1 text-xs text-zinc-400 hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-3">
        {displayNotes.map((note) => (
          <li key={note.id} className="rounded border px-4 py-3">
            <p className="whitespace-pre-wrap text-sm">{note.content}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
              <span>{new Date(note.createdAt).toLocaleString()}</span>
              <span>{note.isOwnNote ? "You" : "Care team"}</span>
              {note.similarity != null && (
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                  {(note.similarity * 100).toFixed(0)}% match
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
