import Link from "next/link";
import { getPatientWithRelatives, createRelative } from "../../actions";
import { getPatientNotes, createPatientNote } from "./notes-actions";
import { NotesSection } from "./notes-section";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ patient, relatives }, notes] = await Promise.all([
    getPatientWithRelatives(id),
    getPatientNotes(id),
  ]);

  const addRelative = createRelative.bind(null, id);
  const addNote = createPatientNote.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <Link
        href="/organization/patients"
        className="text-sm text-zinc-400 hover:underline"
      >
        &larr; Patients
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{patient.name}</h1>
      <div className="mt-1 flex gap-4 text-sm text-zinc-500">
        <span>
          DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
        </span>
        <span className="capitalize">{patient.gender}</span>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Relatives</h2>

        <form action={addRelative} className="mt-4 flex gap-2">
          <input
            name="name"
            type="text"
            placeholder="Name"
            required
            className="flex-1 rounded border px-3 py-2"
          />
          <select
            name="relationship"
            required
            className="rounded border px-3 py-2"
          >
            <option value="">Relationship</option>
            <option value="spouse">Spouse</option>
            <option value="child">Child</option>
            <option value="parent">Parent</option>
            <option value="sibling">Sibling</option>
            <option value="other">Other</option>
          </select>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Add
          </button>
        </form>

        <ul className="mt-6 flex flex-col gap-2">
          {relatives.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded border px-4 py-3"
            >
              <span className="font-medium">{r.name}</span>
              <span className="text-sm capitalize text-zinc-400">
                {r.relationship}
              </span>
            </li>
          ))}
          {relatives.length === 0 && (
            <li className="text-sm text-zinc-400">No relatives on record.</li>
          )}
        </ul>
      </section>

      <NotesSection
        patientId={id}
        initialNotes={notes}
        addNoteAction={addNote}
      />

      <div className="mt-4">
        <Link
          href={`/organization/notes?patient=${id}`}
          className="text-sm text-zinc-400 hover:underline"
        >
          View in full notes search &rarr;
        </Link>
      </div>
    </div>
  );
}
