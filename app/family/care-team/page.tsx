import { careTeam, family, patient } from "../data";

const familyContacts = [
  { name: "Sarah Whitman", relationship: "Daughter (primary caregiver)", phone: "(530) 555-0167", you: true },
  { name: "Michael Whitman", relationship: "Son (secondary)", phone: "(530) 555-0189" },
  { name: "Mark Whitman", relationship: "Grandson (afternoon shift)", phone: "(530) 555-0193" },
];

export default function CareTeamPage() {
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Care Team</h1>
          <p className="mt-1 text-sm text-slate-500">
            People supporting {patient.first}'s care. Tap any number to call.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-brand bg-white px-3 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
        >
          + Invite a caregiver
        </button>
      </div>

      <section className="mb-6 rounded-xl border border-status-urgent/30 bg-red-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-red-800">
              Crisis line — 24/7
            </h2>
            <p className="mt-1 text-base text-slate-900">
              If {patient.first}'s symptoms feel like an emergency, call your
              hospice's after-hours nurse before 911.
            </p>
          </div>
          <a
            href="tel:+15305550000"
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M22 16.92V21a1 1 0 0 1-1.1 1 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 3.1 4.1 1 1 0 0 1 4.1 3h4.1a1 1 0 0 1 1 .8 12 12 0 0 0 .6 2.6 1 1 0 0 1-.2 1L8 8.9a16 16 0 0 0 6 6l1.5-1.5a1 1 0 0 1 1-.2 12 12 0 0 0 2.6.6 1 1 0 0 1 .8 1z" />
            </svg>
            (530) 555-0000
          </a>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Hospice clinical team
        </h2>
        <div className="grid gap-4">
          {careTeam.map((m) => (
            <article
              key={m.name}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-start gap-4 px-6 py-5">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-semibold text-white">
                  {m.initials}
                  {m.available && (
                    <span className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {m.name}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {m.credentials}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-brand">{m.role}</p>
                  <p className="mt-2 text-sm text-slate-600">{m.bio}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {m.available ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Available now
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Off-hours
                      </span>
                    )}
                    <span className="text-slate-500">{m.availability}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={`tel:${m.phone.replace(/\D/g, "")}`}
                    className="flex items-center justify-center gap-2 rounded-lg bg-status-stable px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M22 16.92V21a1 1 0 0 1-1.1 1 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 3.1 4.1 1 1 0 0 1 4.1 3h4.1a1 1 0 0 1 1 .8 12 12 0 0 0 .6 2.6 1 1 0 0 1-.2 1L8 8.9a16 16 0 0 0 6 6l1.5-1.5a1 1 0 0 1 1-.2 12 12 0 0 0 2.6.6 1 1 0 0 1 .8 1z" />
                    </svg>
                    Call
                  </a>
                  <a
                    href={`mailto:${m.email}`}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Email
                  </a>
                </div>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-6 py-2 text-xs text-slate-500">
                <span className="tabular-nums">{m.phone}</span>
                <span className="mx-2">·</span>
                <span>{m.email}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Family caregivers
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {familyContacts.map((c) => (
              <li
                key={c.name}
                className="flex flex-wrap items-center gap-3 px-6 py-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                  {c.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {c.name}
                    {c.you && (
                      <span className="ml-2 rounded bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                        you
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{c.relationship}</div>
                </div>
                <a
                  href={`tel:${c.phone.replace(/\D/g, "")}`}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {c.phone}
                </a>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            Logged in as <span className="font-medium text-slate-700">{family.name}</span>{" "}
            ({family.relationship})
          </div>
        </div>
      </section>
    </>
  );
}
