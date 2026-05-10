"use client";

import { useState, useTransition } from "react";
import { getOrganizationNotes, searchOrganizationNotes } from "./actions";
import Link from "next/link";

type Note = {
  id: string;
  patientId: string;
  patientName: string;
  content: string;
  createdAt: string;
  similarity?: number;
};

type Patient = {
  id: string;
  name: string;
};

export function NotesSearch({
  initialNotes,
  patients,
  initialPatientId,
}: {
  initialNotes: Note[];
  patients: Patient[];
  initialPatientId?: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId ?? "");
  const [isSearching, startSearch] = useTransition();

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    startSearch(async () => {
      const results = await searchOrganizationNotes(
        query,
        selectedPatientId || undefined,
      );
      setSearchResults(results);
    });
  }

  function handlePatientFilter(patientId: string) {
    setSelectedPatientId(patientId);
    if (searchQuery.trim()) {
      startSearch(async () => {
        const results = await searchOrganizationNotes(
          searchQuery,
          patientId || undefined,
        );
        setSearchResults(results);
      });
    } else {
      startSearch(async () => {
        const filtered = await getOrganizationNotes(patientId || undefined);
        setNotes(filtered);
        setSearchResults(null);
      });
    }
  }

  const displayNotes = searchResults ?? notes;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search notes semantically..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
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
      </div>

      {isSearching && (
        <p className="text-xs text-zinc-400">Searching...</p>
      )}
      {searchResults && (
        <button
          onClick={() => {
            setSearchQuery("");
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
            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
              <Link
                href={`/organization/patients/${note.patientId}`}
                className="font-medium text-zinc-600 hover:underline dark:text-zinc-300"
              >
                {note.patientName}
              </Link>
              <span>{new Date(note.createdAt).toLocaleString()}</span>
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
