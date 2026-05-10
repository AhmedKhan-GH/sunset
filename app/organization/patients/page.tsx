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

      <form action={createPatient} className="mt-6 flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            name="name"
            type="text"
            placeholder="Full name"
            required
            className="flex-1 rounded border px-3 py-2"
          />
          <input
            name="dateOfBirth"
            type="date"
            required
            className="rounded border px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <select name="gender" required className="rounded border px-3 py-2">
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="unknown">Unknown</option>
          </select>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Add patient
          </button>
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
