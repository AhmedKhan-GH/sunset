import { getNotes, createNote } from "@/lib/notes/actions";
import { resolveNoteContext } from "@/lib/notes/context";
import { NotesViewer } from "@/components/notes-viewer";

export default async function PatientNotesPage() {
  // Sequential, not Promise.all — running resolveNoteContext + getNotes in
  // parallel each triggers a supabase.auth.getUser() call which races on
  // cookie writes from Server Components and corrupts the session.
  const ctx = await resolveNoteContext();
  const notes = await getNotes();

  const addNote = createNote.bind(null, ctx.patientId!);

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">My Notes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Notes from your care team and yourself.
      </p>
      <div className="mt-6">
        <NotesViewer
          initialNotes={notes}
          userId={ctx.userId}
          organizationId={ctx.organizationId}
          showAddForm
          addNotePlaceholder="Add a personal note (how you're feeling, questions for your care team...)"
          addNoteAction={addNote}
        />
      </div>
    </div>
  );
}
