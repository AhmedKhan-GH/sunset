import Link from "next/link";
import { getPatientWithRelatives, createRelative } from "../../actions";
import { getNotes, createNote, resolveNoteContext } from "@/lib/notes/actions";
import { NotesViewer } from "@/components/notes-viewer";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ patient, relatives }, notes, ctx] = await Promise.all([
    getPatientWithRelatives(id),
    getNotes(id),
    resolveNoteContext(),
  ]);

  const addRelative = createRelative.bind(null, id);
  const addNote = createNote.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <Link
        href="/organization/patients"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Patients
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{patient.name}</h1>
      <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
        <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
        <span className="capitalize">{patient.gender}</span>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Relatives</h2>

        <form action={addRelative} className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Full name</span>
              <input
                name="name"
                type="text"
                placeholder="Jane Doe"
                required
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <input
                name="email"
                type="email"
                placeholder="relative@example.com"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Relationship</span>
              <select
                name="relationship"
                required
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              >
                <option value="">Select...</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              Add relative
            </button>
          </div>
        </form>

        <ul className="mt-6 flex flex-col gap-2">
          {relatives.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <span className="font-medium">{r.name}</span>
                {r.email && (
                  <span className="ml-2 text-sm text-muted-foreground">{r.email}</span>
                )}
              </div>
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                {r.relationship}
              </span>
            </li>
          ))}
          {relatives.length === 0 && (
            <li className="text-sm text-muted-foreground">No relatives on record.</li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Notes</h2>
        <div className="mt-4">
          <NotesViewer
            initialNotes={notes}
            fixedPatientId={id}
            userId={ctx.userId}
            organizationId={ctx.organizationId}
            showAddForm
            addNotePlaceholder="Add a clinical note..."
            addNoteAction={addNote}
          />
        </div>
      </section>

      <div className="mt-4">
        <Link
          href={`/organization/notes?patient=${id}`}
          className="text-sm font-medium text-brand hover:underline"
        >
          View in full notes search &rarr;
        </Link>
      </div>
    </div>
  );
}
