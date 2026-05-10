import { getOrganizations, createOrganization } from "./actions";

export default async function AdminPage() {
  const orgs = await getOrganizations();

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Organizations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage all organizations on the platform.
      </p>

      <form action={createOrganization} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex gap-3">
          <input
            name="name"
            type="text"
            placeholder="Organization name"
            required
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Create
          </button>
        </div>
      </form>

      <ul className="mt-8 flex flex-col gap-2">
        {orgs.map((org) => (
          <li
            key={org.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <span className="font-medium">{org.name}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(org.createdAt * 1000).toLocaleDateString()}
            </span>
          </li>
        ))}
        {orgs.length === 0 && (
          <li className="text-sm text-muted-foreground">No organizations yet.</li>
        )}
      </ul>
    </div>
  );
}
