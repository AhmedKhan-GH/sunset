import Link from "next/link";
import { getPatients, getMyOrganization, createPatient } from "../actions";

export default async function PatientsPage() {
  const [patients, organization] = await Promise.all([
    getPatients(),
    getMyOrganization(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Patients</h1>
      {organization && (
        <p className="mt-1 text-sm text-zinc-500">{organization.name}</p>
      )}

      <form action={createPatient} className="mt-6 rounded border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Full name</span>
            <input
              name="name"
              type="text"
              placeholder="Jane Doe"
              required
              className="rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Date of birth</span>
            <input
              name="dateOfBirth"
              type="date"
              required
              className="rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Gender</span>
            <select name="gender" required className="rounded border px-3 py-2 text-sm">
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
            >
              Add patient
            </button>
          </div>
        </div>
      </form>

      <ul className="mt-8 flex flex-col gap-2">
        {patients.map((p) => (
          <li key={p.id}>
            <Link
              href={`/organization/patients/${p.id}`}
              className="flex items-center justify-between rounded border px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-sm text-zinc-400">
                {new Date(p.dateOfBirth).toLocaleDateString()} · {p.gender}
              </span>
            </Link>
          </li>
        ))}
        {patients.length === 0 && (
          <li className="text-sm text-zinc-400">No patients yet.</li>
        )}
      </ul>
    </div>
  );
}
