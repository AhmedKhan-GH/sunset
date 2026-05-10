import { getLinkedPatientNotes, addNoteForLinkedPatient } from "./actions";
import { RelativeNotes } from "./relative-notes";

export default async function RelativeNotesPage() {
  const { patientName, notes } = await getLinkedPatientNotes();

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Notes</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Care notes for {patientName}.
      </p>
      <div className="mt-6">
        <RelativeNotes
          initialNotes={notes}
          patientName={patientName}
          addNoteAction={addNoteForLinkedPatient}
        />
      </div>
    </div>
  );
}
