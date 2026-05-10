import { getMyNotes, addMyNote } from "./actions";
import { PatientNotes } from "./patient-notes";

export default async function PatientNotesPage() {
  const notes = await getMyNotes();

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">My Notes</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Notes from your care team and yourself.
      </p>
      <div className="mt-6">
        <PatientNotes initialNotes={notes} addNoteAction={addMyNote} />
      </div>
    </div>
  );
}
