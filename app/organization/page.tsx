import { getPractitioners, createPractitioner } from "./actions";
import { InviteForm } from "@/components/invite-form";

export default async function OrganizationPage() {
  const practitioners = await getPractitioners();

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Practitioners</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage practitioners in your organization. Share the invite code
        securely so they can register at <code className="font-mono text-brand">/register</code>.
      </p>

      <InviteForm action={createPractitioner} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Full name</span>
            <input
              name="name"
              type="text"
              placeholder="Dr. Jane Smith"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input
              name="email"
              type="email"
              placeholder="practitioner@example.com"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Specialty</span>
            <input
              name="specialty"
              type="text"
              placeholder="e.g. Palliative Medicine"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">License number</span>
            <input
              name="licenseNumber"
              type="text"
              placeholder="e.g. MD-12345"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">NPI</span>
            <input
              name="npi"
              type="text"
              placeholder="10-digit NPI"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Add practitioner
          </button>
        </div>
      </InviteForm>

      <ul className="mt-8 flex flex-col gap-2">
        {practitioners.map((p) => (
          <li
            key={p.userId}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.name ?? p.email}</span>
              {p.specialty && (
                <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
                  {p.specialty}
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
              {p.name && <span>{p.email}</span>}
              {p.licenseNumber && <span>License: {p.licenseNumber}</span>}
              {p.npi && <span>NPI: {p.npi}</span>}
            </div>
          </li>
        ))}
        {practitioners.length === 0 && (
          <li className="text-sm text-muted-foreground">No practitioners yet.</li>
        )}
      </ul>
    </div>
  );
}
