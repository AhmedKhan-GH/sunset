import { pastVisits, patient, upcomingVisits, type Visit } from "../data";

const visitTypeStyles: Record<Visit["type"], string> = {
  "Home Visit": "bg-violet-100 text-violet-700 ring-violet-600/20",
  "Phone Check-In": "bg-sky-100 text-sky-700 ring-sky-600/20",
  "Emergency Visit": "bg-red-100 text-red-700 ring-red-600/20",
  "Initial Assessment": "bg-slate-100 text-slate-700 ring-slate-600/20",
};

export default function VisitsPage() {
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Visits</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upcoming and past visits with notes from {patient.first}'s care
            team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Add to calendar
          </button>
          <button
            type="button"
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Request a visit
          </button>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Upcoming · {upcomingVisits.length} scheduled
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcomingVisits.map((v) => (
            <article
              key={v.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-start gap-4 border-b border-slate-100 bg-brand/5 px-5 py-4">
                <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-white py-2 ring-1 ring-inset ring-brand/30">
                  <span className="text-xs font-semibold uppercase text-brand">
                    {v.weekday}
                  </span>
                  <span className="text-2xl font-bold leading-none text-slate-900">
                    {v.date.split(" ")[1]}
                  </span>
                  <span className="text-xs uppercase text-slate-500">
                    {v.date.split(" ")[0]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${visitTypeStyles[v.type]}`}
                  >
                    {v.type}
                  </span>
                  <h3 className="mt-1.5 text-sm font-semibold text-slate-900">
                    {v.who}
                  </h3>
                  <p className="text-xs text-slate-500">{v.role}</p>
                  <p className="mt-1.5 text-sm tabular-nums text-slate-700">
                    {v.time}
                  </p>
                </div>
              </div>
              {v.agenda && (
                <div className="px-5 py-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Agenda
                  </div>
                  <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
                    {v.agenda.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex border-t border-slate-100 bg-slate-50">
                <button
                  type="button"
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Reschedule
                </button>
                <span className="w-px bg-slate-200" />
                <button
                  type="button"
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Past visits
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {pastVisits.map((v) => (
              <li key={v.id} className="px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-slate-50 py-2 ring-1 ring-inset ring-slate-200">
                      <span className="text-xs font-semibold uppercase text-slate-600">
                        {v.weekday}
                      </span>
                      <span className="text-2xl font-bold leading-none text-slate-900">
                        {v.date.split(" ")[1]}
                      </span>
                      <span className="text-xs uppercase text-slate-500">
                        {v.date.split(" ")[0]}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${visitTypeStyles[v.type]}`}
                      >
                        {v.type}
                      </span>
                      <h3 className="mt-1.5 text-base font-semibold text-slate-900">
                        {v.who}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {v.role} · {v.time !== "—" ? `${v.time} · ` : ""}
                        {v.duration}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                    >
                      <path d="m5 12 5 5 9-12" />
                    </svg>
                    Completed
                  </span>
                </div>

                {v.summary && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Visit notes
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {v.summary}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            Showing {pastVisits.length} most recent visits ·{" "}
            <a href="#" className="font-medium text-brand hover:underline">
              View all visits
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
