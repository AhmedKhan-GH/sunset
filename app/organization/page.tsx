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

      <form action={createPractitioner} className="mt-6 flex gap-2">
        <input
          name="email"
          type="email"
          placeholder="practitioner@example.com"
          required
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Add practitioner
        </button>
      </form>

      <ul className="mt-8 flex flex-col gap-2">
        {practitioners.map((p) => (
          <li
            key={p.userId}
            className="flex items-center justify-between rounded border px-4 py-3"
          >
            <span className="font-medium">{p.email}</span>
            <span className="text-xs text-zinc-400">practitioner</span>
          </li>
        ))}
        {practitioners.length === 0 && (
          <li className="text-sm text-zinc-400">No practitioners yet.</li>
        )}
      </ul>
    </div>
  );
}
