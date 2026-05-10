import { getNotes, createNote } from "@/lib/notes/actions";
import { resolveNoteContext } from "@/lib/notes/context";
import { NotesViewer } from "@/components/notes-viewer";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function RelativeNotesPage() {
  // Sequential — see patient/notes for the parallel-auth-race rationale.
  const ctx = await resolveNoteContext();
  const notes = await getNotes();
  const [patient] = await db
    .select({ name: patients.name })
    .from(patients)
    .where(eq(patients.id, ctx.patientId!));

  const addNote = createNote.bind(null, ctx.patientId!);

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Notes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
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
