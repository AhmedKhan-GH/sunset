import { getNotes, createNote, resolveNoteContext } from "@/lib/notes/actions";
import { NotesViewer } from "@/components/notes-viewer";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function RelativeNotesPage() {
  const ctx = await resolveNoteContext();

  const [notes, [patient]] = await Promise.all([
    getNotes(),
    db.select({ name: patients.name }).from(patients).where(eq(patients.id, ctx.patientId!)),
  ]);

  const addNote = createNote.bind(null, ctx.patientId!);

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Notes</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Care notes for {patient.name}.
      </p>
      <div className="mt-6">
        <NotesViewer
          initialNotes={notes}
          userId={ctx.userId}
          organizationId={ctx.organizationId}
          showAddForm
          addNotePlaceholder={`Add an observation about ${patient.name}...`}
          addNoteAction={addNote}
        />
      </div>
    </div>
  );
}
