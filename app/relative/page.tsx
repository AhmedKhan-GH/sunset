import { getMyRelativeRow, getRelatedPatient, getCareTeam } from "./actions";

export default async function RelativePage() {
  const [relative, patient, careTeam] = await Promise.all([
    getMyRelativeRow(),
    getRelatedPatient(),
    getCareTeam(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">My family member</h1>
      <p className="mt-1 text-sm text-zinc-500">
        You are listed as{" "}
        <span className="capitalize">{relative.relationship}</span> of{" "}
        {patient.name}.
      </p>

      <section className="mt-10 rounded border px-4 py-3">
        <div className="text-lg font-medium">{patient.name}</div>
        <div className="mt-1 flex gap-4 text-sm text-zinc-500">
          <span>
            DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
          </span>
          <span className="capitalize">{patient.gender}</span>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Care team</h2>
        <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-zinc-500">Practitioner</dt>
          <dd>
            {careTeam.practitionerEmail ?? (
              <span className="text-zinc-400">Unassigned</span>
            )}
          </dd>
          <dt className="text-zinc-500">Organization</dt>
          <dd>
            {careTeam.organization?.name ?? (
              <span className="text-zinc-400">&mdash;</span>
            )}
          </dd>
        </dl>
      </section>
    </div>
  );
}
