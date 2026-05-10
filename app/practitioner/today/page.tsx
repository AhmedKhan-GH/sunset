import Link from "next/link";
import { practitioner, todayVisits } from "../data";

export default function TodayPage() {
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Today, May 9
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {todayVisits.length} visits scheduled · Review patient charts
            before each visit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Calendar view
          </button>
          <button
            type="button"
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            + Add visit
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <ul className="divide-y divide-slate-100">
          {todayVisits.map((v) => (
            <li
              key={v.id}
              className="flex flex-wrap items-start gap-5 px-6 py-5"
            >
              <div className="flex w-24 shrink-0 flex-col items-center rounded-lg bg-brand/5 py-3 ring-1 ring-inset ring-brand/30">
                <span className="text-xs font-semibold uppercase text-brand">
                  Today
                </span>
                <span className="text-xl font-bold leading-none text-slate-900">
                  {v.time}
                </span>
                <span className="mt-1 text-xs uppercase text-slate-500">
                  {v.duration}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link
                    href={`/practitioner/patients/${v.patientId}`}
                    className="text-lg font-semibold text-slate-900 hover:underline"
                  >
                    {v.patient}
                  </Link>
                  <span className="font-mono text-xs text-slate-500">
                    {v.patientId} · Age {v.age}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
                    {v.type}
                  </span>
                  <span className="text-xs text-slate-500">
                    {v.time} – {v.endTime}
                  </span>
                </div>

                {v.flag && (
                  <div className="mt-3 inline-flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    >
                      <path d="m12 3 10 17H2z" />
                      <path d="M12 10v4M12 17h.01" />
                    </svg>
                    <span className="font-medium">{v.flag}</span>
                  </div>
                )}

                <div className="mt-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Agenda
                  </div>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {v.agenda.map((item) => (
                      <li
                        key={item}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                <Link
                  href={`/practitioner/patients/${v.patientId}`}
                  className="rounded-md bg-brand px-4 py-2 text-center text-sm font-semibold text-white hover:brightness-110"
                >
                  Review chart
                </Link>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reschedule
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-sm text-slate-500">
        Signed in as {practitioner.name} · {practitioner.org}
      </p>
    </>
  );
}
