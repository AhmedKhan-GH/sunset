"use client";

import { useTransition, useState } from "react";
import { triggerManualCheckin, type Checkin } from "@/lib/checkins/actions";

const SYMPTOMS: {
  key: keyof Checkin;
  label: string;
  hiGood?: boolean;
}[] = [
  { key: "pain_score",                label: "Pain" },
  { key: "nausea_score",              label: "Nausea" },
  { key: "shortness_of_breath_score", label: "SOB" },
  { key: "anxiety_score",             label: "Anxiety" },
  { key: "fatigue_score",             label: "Fatigue" },
  { key: "appetite_score",            label: "Appetite", hiGood: true },
  { key: "mood_score",                label: "Mood",     hiGood: true },
  { key: "sleep_score",               label: "Sleep",    hiGood: true },
];

export function PatientCheckinsList({
  patientId,
  initial,
}: {
  patientId: string;
  initial: Checkin[];
}) {
  const [checkins, setCheckins] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState("");

  const completed = checkins.filter((c) => c.status === "completed");
  const pendingList = checkins.filter((c) => c.status === "pending");

  function fireManual() {
    setHint("");
    startTransition(async () => {
      try {
        await triggerManualCheckin(patientId);
        setHint("New pending check-in created. The patient will see it on their portal.");
        // Optimistic-ish: just append a placeholder; realtime would replace
        setCheckins((prev) => [
          {
            id: crypto.randomUUID(),
            patient_id: patientId,
            organization_id: "",
            scheduled_at: new Date().toISOString(),
            scheduled_kind: "manual",
            status: "pending",
            completed_at: null,
            pain_score: null,
            nausea_score: null,
            shortness_of_breath_score: null,
            anxiety_score: null,
            fatigue_score: null,
            appetite_score: null,
            mood_score: null,
            sleep_score: null,
            notes: null,
            created_at: new Date().toISOString(),
          } as Checkin,
          ...prev,
        ]);
      } catch (e: any) {
        setHint(`Error: ${e.message ?? String(e)}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Trigger check-in now</div>
            <div className="text-xs text-muted-foreground">
              Sends a pending check-in to this patient&apos;s portal immediately.
            </div>
          </div>
          <button
            type="button"
            onClick={fireManual}
            disabled={pending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Firing…" : "Trigger"}
          </button>
        </div>
        {hint && (
          <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
        )}
      </div>

      {/* Trends */}
      {completed.length >= 2 && (
        <div>
          <h3 className="text-sm font-semibold">Trends — last {completed.length} completed</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Oldest → newest, left to right. Arrow shows whether the latest is
            better, worse, or same vs the first in the window.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Symptom</th>
                  {[...completed].reverse().map((c) => (
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
                  const series = [...completed]
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
                    <tr key={String(s.key)} className="border-t border-slate-100">
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
        </div>
      )}

      {/* Pending */}
      {pendingList.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Pending ({pendingList.length})</h3>
          <ul className="mt-2 space-y-2">
            {pendingList.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium capitalize">
                    {c.scheduled_kind} check-in
                  </span>
                  <span className="text-muted-foreground">
                    Sent {new Date(c.scheduled_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-xs text-amber-900">
                  Waiting for patient to fill it out.
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent completed */}
      <div>
        <h3 className="text-sm font-semibold">
          Recent completed ({completed.length})
        </h3>
        {completed.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No completed check-ins yet for this patient.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {completed.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium capitalize">
                    {c.scheduled_kind} check-in
                  </span>
                  <span className="text-muted-foreground">
                    {c.completed_at
                      ? new Date(c.completed_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs sm:grid-cols-8">
                  {SYMPTOMS.map((s) => (
                    <ScoreChip
                      key={String(s.key)}
                      value={c[s.key] as number | null}
                      label={s.label}
                      hiGood={s.hiGood}
                    />
                  ))}
                </div>
                {c.notes && (
                  <p className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    &ldquo;{c.notes}&rdquo;
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ScoreChip({
  value,
  label,
  hiGood = false,
}: {
  value: number | null;
  label?: string;
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
      className={`inline-flex flex-col items-center rounded px-1.5 py-0.5 text-center font-mono text-xs font-semibold ${cls}`}
    >
      {label && (
        <span className="text-[9px] font-normal uppercase tracking-wide">
          {label}
        </span>
      )}
      <span>{value ?? "—"}</span>
    </span>
  );
}
