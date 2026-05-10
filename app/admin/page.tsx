import { getOrganizations, createOrganization } from "./actions";

export default async function AdminPage() {
  const orgs = await getOrganizations();

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-foreground">Platform Admin</h1>

      <form action={createOrganization} className="mt-6 flex gap-2">
        <input
          name="name"
          type="text"
          placeholder="Organization name"
          required
          className="flex-1 rounded border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
        />
        <button
          type="submit"
          className="rounded bg-brand px-4 py-2 font-medium text-white transition-colors hover:bg-brand-soft"
        >
          Create
        </button>
      </form>

      <ul className="mt-8 flex flex-col gap-2">
        {orgs.map((org) => (
          <li
            key={org.id}
            className="flex items-center justify-between rounded border border-border bg-surface px-4 py-3"
          >
            <span className="font-medium text-foreground">{org.name}</span>
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
