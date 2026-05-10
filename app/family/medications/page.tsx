import { allergies, medications, patient } from "../data";

export default function MedicationsPage() {
  const prnMeds = medications.filter((m) => m.prn);
  const scheduledMeds = medications.filter((m) => !m.prn);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Medications</h1>
          <p className="mt-1 text-sm text-slate-500">
            What {patient.first} is taking, when it's safe to give next, and how
            to give each one.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Print medication list
        </button>
      </div>

      {allergies.length > 0 && (
        <section className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="m12 3 10 17H2z" />
                <path d="M12 10v4M12 17h.01" />
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-semibold text-red-800">
                Allergies — never give these
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {allergies.map((a) => (
                  <li
                    key={a.allergen}
                    className="rounded-md bg-white px-3 py-1.5 text-sm ring-1 ring-inset ring-red-200"
                  >
                    <span className="font-semibold text-red-800">
                      {a.allergen}
                    </span>
                    <span className="ml-1.5 text-xs text-red-600">
                      {a.severity} · {a.reaction}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          As-needed (PRN)
        </h2>
        <div className="grid gap-4">
          {prnMeds.map((m) => {
            const safeToGive = m.nextOk.startsWith("OK");
            return (
              <article
                key={m.name}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {m.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Generic: {m.generic}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
                    {m.purpose}
                  </span>
                </header>

                <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">
                        Dose
                      </dt>
                      <dd className="mt-0.5 font-semibold text-slate-900">
                        {m.dose}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">
                        How
                      </dt>
                      <dd className="mt-0.5 text-slate-900">{m.route}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs uppercase tracking-wide text-slate-500">
                        Schedule
                      </dt>
                      <dd className="mt-0.5 text-slate-900">{m.schedule}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs uppercase tracking-wide text-slate-500">
                        Max in 24 hours
                      </dt>
                      <dd className="mt-0.5 tabular-nums text-slate-900">
                        {m.maxDaily}
                      </dd>
                    </div>
                  </dl>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Last given
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-slate-900">
                      {m.lastGiven}
                    </div>
                    <div
                      className={`mt-2 text-sm font-semibold ${safeToGive ? "text-emerald-700" : "text-amber-700"}`}
                    >
                      {safeToGive ? "✓ " : "⏳ "}
                      {m.nextOk}
                    </div>
                    <button
                      type="button"
                      disabled={!safeToGive}
                      className={
                        safeToGive
                          ? "mt-3 w-full rounded-lg bg-status-stable px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                          : "mt-3 w-full cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400"
                      }
                    >
                      {safeToGive
                        ? `Mark as given now`
                        : `Wait — ${m.nextOk.replace("OK after ", "until ")}`}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        How to give
                      </div>
                      <p className="mt-0.5 text-sm text-slate-700">
                        {m.instructions}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Side effects to watch for
                      </div>
                      <p className="mt-0.5 text-sm text-slate-700">
                        {m.sideEffects.join(" · ")}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {scheduledMeds.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Scheduled (give every day)
          </h2>
          <div className="grid gap-4">
            {scheduledMeds.map((m) => {
              const safeToGive = m.nextOk.startsWith("OK");
              return (
                <article
                  key={m.name}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {m.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Generic: {m.generic}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      {m.purpose}
                    </span>
                  </header>

                  <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Dose
                        </dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">
                          {m.dose}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          How
                        </dt>
                        <dd className="mt-0.5 text-slate-900">{m.route}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Schedule
                        </dt>
                        <dd className="mt-0.5 text-slate-900">{m.schedule}</dd>
                      </div>
                    </dl>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Last given
                      </div>
                      <div className="mt-0.5 text-sm font-medium text-slate-900">
                        {m.lastGiven}
                      </div>
                      <div
                        className={`mt-2 text-sm font-semibold ${safeToGive ? "text-emerald-700" : "text-amber-700"}`}
                      >
                        {m.nextOk}
                      </div>
                      <button
                        type="button"
                        className="mt-3 w-full rounded-lg bg-status-stable px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                      >
                        Mark as given now
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          How to give
                        </div>
                        <p className="mt-0.5 text-sm text-slate-700">
                          {m.instructions}
                        </p>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Side effects to watch for
                        </div>
                        <p className="mt-0.5 text-sm text-slate-700">
                          {m.sideEffects.join(" · ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h3 className="text-sm font-semibold text-slate-900">
          Need a refill or have a question?
        </h3>
        <p className="mt-1">
          Davis Hospice Pharmacy ·{" "}
          <a
            href="tel:+15305550100"
            className="font-medium text-brand hover:underline"
          >
            (530) 555-0100
          </a>{" "}
          · Daniel Wong, PharmD · Daily 8 AM – 9 PM
        </p>
      </section>
    </>
  );
}
