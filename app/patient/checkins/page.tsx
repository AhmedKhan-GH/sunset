import Link from "next/link";
import { redirect } from "next/navigation";
import {
  listMyPendingCheckins,
  listMyRecentCompletedCheckins,
} from "@/lib/checkins/actions";

export default async function PatientCheckinsPage() {
  let pending: Awaited<ReturnType<typeof listMyPendingCheckins>>;
  let recent: Awaited<ReturnType<typeof listMyRecentCompletedCheckins>>;
  try {
    [pending, recent] = await Promise.all([
      listMyPendingCheckins(),
      listMyRecentCompletedCheckins(5),
    ]);
  } catch {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Check-ins</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Quick symptom check-ins are scheduled twice a day. Filling them out
        keeps your care team up to date — about a minute each.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Waiting for you</h2>
        {pending.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-muted-foreground shadow-sm">
            No pending check-ins right now. We&apos;ll notify you when the
            next one is scheduled.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {c.scheduled_kind} check-in
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Scheduled {new Date(c.scheduled_at).toLocaleString()}
                  </span>
                </div>
                <Link
                  href={`/patient/checkins/${c.id}`}
                  className="mt-4 inline-flex items-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-black"
                >
                  Start →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent</h2>
        {recent.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-muted-foreground shadow-sm">
            No completed check-ins yet.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {recent.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {c.scheduled_kind} check-in
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.completed_at
                      ? new Date(c.completed_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs sm:grid-cols-8">
                  <ScoreCell label="Pain" value={c.pain_score} />
                  <ScoreCell label="Nausea" value={c.nausea_score} />
                  <ScoreCell label="SOB" value={c.shortness_of_breath_score} />
                  <ScoreCell label="Anxiety" value={c.anxiety_score} />
                  <ScoreCell label="Fatigue" value={c.fatigue_score} />
                  <ScoreCell label="Appetite" value={c.appetite_score} hiGood />
                  <ScoreCell label="Mood" value={c.mood_score} hiGood />
                  <ScoreCell label="Sleep" value={c.sleep_score} hiGood />
                </div>
                {c.notes && (
                  <p className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {c.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ScoreCell({
  label,
  value,
  hiGood = false,
}: {
  label: string;
  value: number | null;
  hiGood?: boolean;
}) {
  // For most symptoms, low = good. For appetite/mood/sleep, high = good.
  const cls =
    value === null
      ? "bg-slate-100 text-slate-500"
      : hiGood
        ? value >= 7
          ? "bg-emerald-100 text-emerald-800"
          : value >= 4
            ? "bg-amber-100 text-amber-800"
            : "bg-red-100 text-red-800"
        : value >= 7
          ? "bg-red-100 text-red-800"
          : value >= 4
            ? "bg-amber-100 text-amber-800"
            : "bg-emerald-100 text-emerald-800";
  return (
    <div className={`rounded px-2 py-1 text-center font-medium ${cls}`}>
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
      <div className="font-mono text-sm">{value ?? "—"}</div>
    </div>
  );
}
