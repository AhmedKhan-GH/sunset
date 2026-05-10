import { getPractitioners, createPractitioner } from "./actions";

export default async function OrganizationPage() {
  const practitioners = await getPractitioners();

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Practitioners</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage practitioners in your organization. New accounts are created with
        the temporary password <code className="font-mono">changeme123</code>.
      </p>

      <form action={createPractitioner} className="mt-6 rounded border p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Email</span>
            <input
              name="email"
              type="email"
              placeholder="practitioner@example.com"
              required
              className="rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Specialty</span>
            <input
              name="specialty"
              type="text"
              placeholder="e.g. Palliative Medicine"
              className="rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">License number</span>
            <input
              name="licenseNumber"
              type="text"
              placeholder="e.g. MD-12345"
              className="rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">NPI</span>
            <input
              name="npi"
              type="text"
              placeholder="10-digit NPI"
              className="rounded border px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 w-full rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black sm:w-auto"
        >
          Add practitioner
        </button>
      </form>

      <ul className="mt-8 flex flex-col gap-2">
        {practitioners.map((p) => (
          <li
            key={p.userId}
            className="rounded border px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.email}</span>
              {p.specialty && (
                <span className="text-sm text-zinc-500">{p.specialty}</span>
              )}
            </div>
            {(p.licenseNumber || p.npi) && (
              <div className="mt-1 flex gap-4 text-xs text-zinc-400">
                {p.licenseNumber && <span>License: {p.licenseNumber}</span>}
                {p.npi && <span>NPI: {p.npi}</span>}
              </div>
            )}
          </li>
        ))}
        {practitioners.length === 0 && (
          <li className="text-sm text-zinc-400">No practitioners yet.</li>
        )}
      </ul>
    </div>
  );
}
