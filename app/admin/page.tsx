import { getOrganizations, createOrganization } from "./actions";

export default async function AdminPage() {
  const orgs = await getOrganizations();

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Organizations</h1>

      <form action={createOrganization} className="mt-6 flex gap-2">
        <input
          name="name"
          type="text"
          placeholder="Organization name"
          required
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Create
        </button>
      </form>

      <ul className="mt-8 flex flex-col gap-2">
        {orgs.map((org) => (
          <li
            key={org.id}
            className="flex items-center justify-between rounded border px-4 py-3"
          >
            <span className="font-medium">{org.name}</span>
            <span className="text-xs text-zinc-400">
              {new Date(org.createdAt * 1000).toLocaleDateString()}
            </span>
          </li>
        ))}
        {orgs.length === 0 && (
          <li className="text-sm text-zinc-400">No organizations yet.</li>
        )}
      </ul>
    </div>
  );
}
