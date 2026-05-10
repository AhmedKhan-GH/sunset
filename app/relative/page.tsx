import { getMyRelativeRow, getRelatedPatient } from "./actions";

export default async function RelativePage() {
  const [relative, patient] = await Promise.all([
    getMyRelativeRow(),
    getRelatedPatient(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">My family member</h1>
      <p className="mt-1 text-sm text-zinc-500">
        You are listed as <span className="capitalize">{relative.relationship}</span> of{" "}
        {patient.name}.
      </p>

      <section className="mt-10 rounded border px-4 py-3">
        <div className="text-lg font-medium">{patient.name}</div>
        <div className="mt-1 flex gap-4 text-sm text-zinc-500">
          <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
          <span className="capitalize">{patient.gender}</span>
        </div>
      </section>
    </div>
  );
}
