import Link from "next/link";
import {
  getMyPatient,
  getMyRelatives,
  getCareTeam,
  createRelative,
} from "./actions";
import { getMyCheckinSummary } from "@/lib/checkins/actions";

export default async function PatientPage() {
  const [patient, relatives, careTeam] = await Promise.all([
    getMyPatient(),
    getMyRelatives(),
    getCareTeam(),
  ]);
  // Sequential to avoid auth-race on /patient — see /patient/notes for context
  const summary = await getMyCheckinSummary();

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">{patient.name}</h1>
      <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
        <span>
          DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
        </span>
        <span className="capitalize">{patient.gender}</span>
      </div>

      {/* Check-in banner: pending CTA when pending, otherwise last-check-in summary */}
      {summary.pendingCount > 0 ? (
        <Link
          href="/patient/checkins"
          className="mt-6 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm transition hover:bg-amber-100"
        >
          <div>
            <div className="text-sm font-semibold text-amber-900">
              You have {summary.pendingCount} check-in
              {summary.pendingCount === 1 ? "" : "s"} waiting
            </div>
            <div className="mt-1 text-xs text-amber-800">
              Quick symptom check — about a minute. Your care team sees it
              right away.
            </div>
          </div>
          <span className="rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white">
            Start →
          </span>
        </Link>
      ) : summary.lastCompleted ? (
        <Link
          href="/patient/checkins"
          className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50"
        >
          <div>
            <div className="text-sm font-semibold">
              All caught up on check-ins
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Last submitted{" "}
              {new Date(summary.lastCompleted.completed_at!).toLocaleString()} ·
              pain {summary.lastCompleted.pain_score ?? "—"}, fatigue{" "}
              {summary.lastCompleted.fatigue_score ?? "—"}
            </div>
          </div>
          <span className="text-sm text-muted-foreground">View all →</span>
        </Link>
      ) : (
        <Link
          href="/patient/checkins"
          className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50"
        >
          <div>
            <div className="text-sm font-semibold">Symptom check-ins</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Twice a day we&apos;ll ask how you&apos;re feeling so your care
              team can keep up.
            </div>
          </div>
          <span className="text-sm text-muted-foreground">Open →</span>
        </Link>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Care team</h2>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">Practitioner</dt>
            <dd>
              {careTeam.practitionerEmail ?? (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </dd>
            <dt className="text-muted-foreground">Organization</dt>
            <dd>
              {careTeam.organization?.name ?? (
                <span className="text-muted-foreground">&mdash;</span>
              )}
            </dd>
          </dl>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">My relatives</h2>

        <form action={createRelative} className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <input
              name="name"
              type="text"
              placeholder="Name"
              required
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
            <select
              name="relationship"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            >
              <option value="">Relationship</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
              <option value="other">Other</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              Add
            </button>
          </div>
        </form>

        <ul className="mt-6 flex flex-col gap-2">
          {relatives.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <span className="font-medium">{r.name}</span>
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
                {r.relationship}
              </span>
            </li>
          ))}
          {relatives.length === 0 && (
            <li className="text-sm text-muted-foreground">No relatives on record.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
