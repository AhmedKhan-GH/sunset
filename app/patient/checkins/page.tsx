import Link from "next/link";
import { redirect } from "next/navigation";
import {
  listMyPendingCheckins,
  listMyRecentCompletedCheckins,
  startSelfCheckin,
  getMyCheckinSchedule,
} from "@/lib/checkins/actions";
import { ScheduleSettings } from "./schedule-settings";

async function startCheckinAction() {
  "use server";
  const { id } = await startSelfCheckin();
  redirect(`/patient/checkins/${id}`);
}

type SymptomKey =
  | "pain_score"
  | "nausea_score"
  | "shortness_of_breath_score"
  | "anxiety_score"
  | "fatigue_score"
  | "appetite_score"
  | "mood_score"
  | "sleep_score";

const SYMPTOMS: { key: SymptomKey; label: string; hiGood?: boolean }[] = [
  { key: "pain_score", label: "Pain" },
  { key: "nausea_score", label: "Nausea" },
  { key: "shortness_of_breath_score", label: "SOB" },
  { key: "anxiety_score", label: "Anxiety" },
  { key: "fatigue_score", label: "Fatigue" },
  { key: "appetite_score", label: "Appetite", hiGood: true },
  { key: "mood_score", label: "Mood", hiGood: true },
  { key: "sleep_score", label: "Sleep", hiGood: true },
];

export default async function PatientCheckinsPage() {
  let pending: Awaited<ReturnType<typeof listMyPendingCheckins>>;
  let recent: Awaited<ReturnType<typeof listMyRecentCompletedCheckins>>;
  let schedule: Awaited<ReturnType<typeof getMyCheckinSchedule>>;
  try {
    // Sequential to avoid auth-race; safe with cached resolveNoteContext
    pending = await listMyPendingCheckins();
    recent = await listMyRecentCompletedCheckins(7);
    schedule = await getMyCheckinSchedule();
  } catch {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Check-ins</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick symptom check-ins are scheduled twice a day. Filling them out
            keeps your care team up to date — about a minute each.
          </p>
        </div>
        <form action={startCheckinAction}>
          <button
            type="submit"
            className="whitespace-nowrap rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Start a check-in
          </button>
        </form>
      </div>

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
        <h2 className="text-lg font-semibold">Schedule</h2>
        <ScheduleSettings initial={schedule} />
      </section>

      {recent.length >= 2 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Trends — last {recent.length} check-ins</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Each row shows oldest → newest, left to right. Arrow shows whether
            the most recent value is better, worse, or same compared to the
            first one in the window.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Symptom</th>
                  {[...recent].reverse().map((c) => (
                    <th key={c.id} className="px-2 py-2 text-center font-medium">
                      {c.completed_at
                        ? new Date(c.completed_at).toLocaleDateString(undefined, {
                            month: "numeric",
                            day: "numeric",
                          })
                        : "—"}
                      <div className="text-[9px] font-normal capitalize">
                        {c.scheduled_kind[0]}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {SYMPTOMS.map((s) => {
                  const series = [...recent]
                    .reverse()
                    .map((c) => c[s.key] as number | null);
                  const first = series.find((v) => v !== null) ?? null;
                  const last =
                    [...series].reverse().find((v) => v !== null) ?? null;
                  const delta =
                    first !== null && last !== null ? last - first : null;
                  const arrow =
                    delta === null
                      ? "—"
                      : delta === 0
                        ? "→"
                        : (s.hiGood ? delta > 0 : delta < 0)
                          ? "↑ better"
                          : "↓ worse";
                  const arrowClass =
                    delta === null || delta === 0
                      ? "text-muted-foreground"
                      : (s.hiGood ? delta > 0 : delta < 0)
                        ? "text-emerald-700"
                        : "text-red-700";
                  return (
                    <tr key={s.key} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium">{s.label}</td>
                      {series.map((v, i) => (
                        <td key={i} className="px-2 py-2 text-center">
                          <ScoreChip value={v} hiGood={s.hiGood} />
                        </td>
                      ))}
                      <td className={`px-3 py-2 text-center font-medium ${arrowClass}`}>
                        {arrow}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

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

function ScoreChip({
  value,
  hiGood = false,
}: {
  value: number | null;
  hiGood?: boolean;
}) {
  const cls =
    value === null
      ? "bg-slate-100 text-slate-400"
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
    <span
      className={`inline-block min-w-[1.5rem] rounded px-1.5 py-0.5 text-center font-mono text-xs font-semibold ${cls}`}
    >
      {value ?? "—"}
    </span>
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
