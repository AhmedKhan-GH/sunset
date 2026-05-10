import { getNotes, getPatients } from "@/lib/notes/actions";
import { NotesViewer } from "@/components/notes-viewer";

export default async function OrganizationNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const { patient } = await searchParams;
  const [notes, patients] = await Promise.all([
    getNotes(patient),
    getPatients(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Notes</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Semantic search across all patient notes in your organization.
      </p>
      <div className="mt-6">
        <NotesViewer
          initialNotes={notes}
          patients={patients}
          initialPatientId={patient}
          showPatientColumn
          showPatientFilter
        />
      </div>
    </div>
  );
}
