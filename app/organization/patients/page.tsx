import Link from "next/link";
import { getPatients, getMyOrganization, createPatient } from "../actions";
import { InviteForm } from "@/components/invite-form";

export default async function PatientsPage() {
  const [patients, organization] = await Promise.all([
    getPatients(),
    getMyOrganization(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Patients</h1>
      {organization && (
        <p className="mt-1 text-sm text-muted-foreground">{organization.name}</p>
      )}

      <InviteForm action={createPatient} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
              placeholder="patient@example.com"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Date of birth</span>
            <input
              name="dateOfBirth"
              type="date"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Gender</span>
            <select
              name="gender"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Add patient
          </button>
        </div>
      </InviteForm>

      <ul className="mt-8 flex flex-col gap-2">
        {patients.map((p) => (
          <li key={p.id}>
            <Link
              href={`/organization/patients/${p.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:bg-slate-50"
            >
              <div>
                <span className="font-medium">{p.name}</span>
                {p.email && (
                  <span className="ml-2 text-sm text-muted-foreground">{p.email}</span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(p.dateOfBirth).toLocaleDateString()} · {p.gender}
              </span>
            </Link>
          </li>
        ))}
        {patients.length === 0 && (
          <li className="text-sm text-muted-foreground">No patients yet.</li>
        )}
      </ul>
    </div>
  );
}
