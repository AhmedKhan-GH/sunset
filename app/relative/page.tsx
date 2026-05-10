import { getMyRelativeRow, getRelatedPatient, getCareTeam } from "./actions";

export default async function RelativePage() {
  const [relative, patient, careTeam] = await Promise.all([
    getMyRelativeRow(),
    getRelatedPatient(),
    getCareTeam(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">My family member</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You are listed as{" "}
        <span className="capitalize">{relative.relationship}</span> of{" "}
        {patient.name}.
      </p>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-medium">{patient.name}</div>
        <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
          <span>
            DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
          </span>
          <span className="capitalize">{patient.gender}</span>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Care team</h2>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">Practitioner</dt>
            <dd>
              {careTeam.practitionerEmail ?? (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </dd>
            <dt className="text-muted-foreground">Organization</dt>
            <dd>
              {careTeam.organization?.name ?? (
                <span className="text-muted-foreground">&mdash;</span>
              )}
            </dd>
          </dl>
        </div>
      </section>
    </div>
  );
}
