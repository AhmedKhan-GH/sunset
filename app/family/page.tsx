import Link from "next/link";
import {
  careTeam,
  medications,
  patient,
  timeline,
  type TimelineKind,
} from "./data";

const kindStyles: Record<TimelineKind, { bg: string; ring: string; text: string }> = {
  symptom: { bg: "bg-amber-100", ring: "ring-amber-600/20", text: "text-amber-700" },
  medication: { bg: "bg-violet-100", ring: "ring-violet-600/20", text: "text-violet-700" },
  followup: { bg: "bg-emerald-100", ring: "ring-emerald-600/20", text: "text-emerald-700" },
  voice: { bg: "bg-sky-100", ring: "ring-sky-600/20", text: "text-sky-700" },
  alert: { bg: "bg-red-100", ring: "ring-red-600/20", text: "text-red-700" },
  visit: { bg: "bg-slate-100", ring: "ring-slate-600/20", text: "text-slate-700" },
  note: { bg: "bg-slate-100", ring: "ring-slate-600/20", text: "text-slate-700" },
};

const kindIcon: Record<TimelineKind, React.ReactNode> = {
  symptom: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  medication: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="3" y="9" width="18" height="6" rx="3" />
      <path d="M12 9v6" />
    </svg>
  ),
  followup: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="m5 12 5 5 9-12" />
    </svg>
  ),
  voice: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="m12 3 10 17H2z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  ),
  visit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
};

export default function FamilyOverviewPage() {
  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              How {patient.first} is doing right now
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Last update 12 min ago · by Sarah (you)
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Stable · No active alerts
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Pain right now
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums text-amber-700">
                4/10
              </span>
              <span className="text-xs text-emerald-700">
                ↓ from 7 at 11:42 PM
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Last medication
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900">
              Morphine 15 mg
            </div>
            <div className="text-xs text-slate-500">1 hr ago · by you</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Next nurse visit
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900">
              Tue, May 12 · 10:00 AM
            </div>
            <div className="text-xs text-slate-500">Sarah Chen, RN</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/home"
            className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-brand px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v3" />
            </svg>
            Log a symptom for {patient.first}
          </Link>
          <a
            href="tel:+15305550201"
            className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-status-stable px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M22 16.92V21a1 1 0 0 1-1.1 1 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 3.1 4.1 1 1 0 0 1 4.1 3h4.1a1 1 0 0 1 1 .8 12 12 0 0 0 .6 2.6 1 1 0 0 1-.2 1L8 8.9a16 16 0 0 0 6 6l1.5-1.5a1 1 0 0 1 1-.2 12 12 0 0 0 2.6.6 1 1 0 0 1 .8 1z" />
            </svg>
            Call nurse — Sarah Chen
          </a>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Where we left off
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Last 24 hours, every caregiver. So you always know what just
                happened.
              </p>
            </div>
            <Link
              href="/family/activity"
              className="hidden text-sm font-medium text-brand hover:underline sm:inline"
            >
              View full timeline →
            </Link>
          </div>
        </header>

        <ol className="divide-y divide-slate-100">
          {timeline.map((entry, idx) => {
            const showDay = idx === 0 || timeline[idx - 1].day !== entry.day;
            const styles = kindStyles[entry.kind];
            return (
              <li key={entry.id}>
                {showDay && (
                  <div className="bg-slate-50 px-6 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {entry.day}
                  </div>
                )}
                <div className="flex items-start gap-4 px-6 py-3 hover:bg-slate-50">
                  <div className="w-20 shrink-0 pt-0.5 text-sm font-medium tabular-nums text-slate-500">
                    {entry.time}
                  </div>
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${styles.bg} ${styles.ring} ${styles.text}`}
                  >
                    {kindIcon[entry.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">
                      {entry.title}
                    </div>
                    <div className="mt-0.5 text-sm text-slate-600">
                      {entry.detail}
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right text-xs sm:block">
                    <div
                      className={
                        entry.byYou
                          ? "font-semibold text-brand"
                          : "font-medium text-slate-700"
                      }
                    >
                      {entry.by.split(" (")[0]}
                    </div>
                    {entry.by.includes("(") && (
                      <div className="text-slate-400">
                        ({entry.by.split("(")[1]}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Active medications
              </h2>
              <Link
                href="/family/medications"
                className="text-sm font-medium text-brand hover:underline"
              >
                Details →
              </Link>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              What {patient.first} is taking and when it's safe to give next
            </p>
          </header>
          <ul className="divide-y divide-slate-100">
            {medications.slice(0, 4).map((m) => (
              <li key={m.name} className="px-6 py-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-base font-semibold text-slate-900">
                      {m.name}
                    </span>
                    <span className="ml-2 text-sm text-slate-500">
                      {m.dose} · {m.route}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {m.purpose}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    Last given: {m.lastGiven}
                  </span>
                  <span
                    className={
                      m.nextOk.startsWith("OK")
                        ? "font-medium text-emerald-700"
                        : "font-medium text-amber-700"
                    }
                  >
                    {m.nextOk}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Care team
              </h2>
              <Link
                href="/family/care-team"
                className="text-sm font-medium text-brand hover:underline"
              >
                Details →
              </Link>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              People you can reach if something changes
            </p>
          </header>
          <ul className="divide-y divide-slate-100">
            {careTeam.slice(0, 4).map((m) => (
              <li key={m.name} className="flex items-center gap-3 px-6 py-4">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                  {m.initials}
                  {m.available && (
                    <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    {m.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {m.role} · {m.availability.split("·")[0].trim()}
                  </div>
                </div>
                <a
                  href={`tel:${m.phone.replace(/\D/g, "")}`}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {m.phone}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-brand/30 bg-brand/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Sharing care with the rest of the family?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Add other caregivers so they can see {patient.first}'s timeline
              and log symptoms too. Everyone stays in sync.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-brand bg-white px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            Invite a caregiver
          </button>
        </div>
      </section>
    </>
  );
}
