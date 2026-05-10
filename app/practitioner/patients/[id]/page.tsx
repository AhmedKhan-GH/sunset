import Link from "next/link";
import { clinicalNotes, painTrend24h, symptomLog } from "../../data";

const patient = {
  id: "P-1042",
  first: "Eleanor",
  last: "Whitman",
  age: 84,
  diagnosis: "Stage IV breast cancer (mets)",
  codeStatus: "DNR / DNI",
  pps: "50%",
  primaryCaregiver: "Sarah Whitman (daughter)",
  caregiverPhone: "(530) 555-0167",
  status: "stable" as const,
  pain: 4,
  lastLog: "12 min ago",
};

const painPoints = [
  { hoursAgo: 24, pain: 5 },
  { hoursAgo: 21, pain: 4 },
  { hoursAgo: 18, pain: 3 },
  { hoursAgo: 13, pain: 4 },
  { hoursAgo: 10, pain: 6 },
  { hoursAgo: 9, pain: 6, medGiven: "Morphine 10 mg" },
  { hoursAgo: 8, pain: 3, isFollowUp: true },
  { hoursAgo: 4, pain: 5 },
  { hoursAgo: 3, pain: 7, medGiven: "Morphine 15 mg" },
  { hoursAgo: 1, pain: 4, isFollowUp: true },
];
void painTrend24h;

function painColor(pain: number) {
  if (pain >= 7) return "#b91c1c";
  if (pain >= 4) return "#b45309";
  return "#047857";
}

function painTextColor(pain: number) {
  if (pain >= 7) return "text-red-700";
  if (pain >= 4) return "text-amber-700";
  return "text-emerald-700";
}

const medEffectiveness = [
  {
    time: "11:42 PM",
    day: "Yesterday",
    med: "Morphine sulfate 15 mg PO",
    indication: "Pain — abdomen 7/10",
    before: 7,
    after: 4,
    followUpAt: "60 min later",
    effective: true,
  },
  {
    time: "9:15 PM",
    day: "Yesterday",
    med: "Morphine sulfate 10 mg PO",
    indication: "Pain — lower back 6/10",
    before: 6,
    after: 3,
    followUpAt: "45 min later",
    effective: true,
  },
  {
    time: "6:30 AM",
    day: "Yesterday",
    med: "Ondansetron 4 mg ODT",
    indication: "Nausea 5/10",
    before: 5,
    after: 1,
    followUpAt: "30 min later",
    effective: true,
  },
  {
    time: "8:45 PM",
    day: "Wed, May 7",
    med: "Morphine 15 mg + Lorazepam 0.5 mg",
    indication: "Pain 8/10 + anxiety",
    before: 8,
    after: 5,
    followUpAt: "45 min later",
    effective: true,
  },
];

export default async function PractitionerPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // SVG pain trend chart math
  const w = 720;
  const h = 180;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const xFor = (hoursAgo: number) =>
    padL + ((24 - hoursAgo) / 24) * chartW;
  const yFor = (pain: number) => padT + (1 - pain / 10) * chartH;

  const pathD = painPoints
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${xFor(p.hoursAgo).toFixed(1)} ${yFor(p.pain).toFixed(1)}`
    )
    .join(" ");

  const meds = painPoints.filter((p) => p.medGiven);

  return (
    <>
      <div className="mb-4">
        <Link
          href="/practitioner"
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          ← Caseload
        </Link>
      </div>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {patient.last}, {patient.first}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Stable
            </span>
            <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
              {patient.codeStatus}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-mono">{id}</span> · Age {patient.age} · {patient.diagnosis} · PPS {patient.pps}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Primary caregiver: {patient.primaryCaregiver} ·{" "}
            <a
              href={`tel:${patient.caregiverPhone.replace(/\D/g, "")}`}
              className="font-medium text-brand hover:underline"
            >
              {patient.caregiverPhone}
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Adjust med orders
          </button>
          <button
            type="button"
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            + Add clinical note
          </button>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Pain right now
          </div>
          <div
            className={`mt-1 text-3xl font-semibold tabular-nums ${painTextColor(patient.pain)}`}
          >
            {patient.pain}/10
          </div>
          <div className="mt-1 text-xs text-emerald-700">
            ↓ from 7/10 at 11:42 PM
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            24h pain avg
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">4.5</div>
          <div className="mt-1 text-xs text-slate-500">vs 5.1 prior day</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            PRN doses (24h)
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">2</div>
          <div className="mt-1 text-xs text-slate-500">
            Both effective (Δ ≥ 3)
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Last log
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {patient.lastLog}
          </div>
          <div className="mt-1 text-xs text-slate-500">by daughter</div>
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-end justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pain trend · last 24 hours
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Compare pain at 7pm vs 8pm to judge if a dose worked
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              Pain
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-1 bg-violet-500" />
              Med given
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Follow-up
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-3 border-t border-dashed border-red-400" />
              Threshold
            </span>
          </div>
        </header>
        <div className="px-6 py-4">
          <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
            {/* Grid lines + y labels */}
            {[0, 2, 4, 6, 8, 10].map((p) => (
              <g key={p}>
                <line
                  x1={padL}
                  y1={yFor(p)}
                  x2={w - padR}
                  y2={yFor(p)}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text
                  x={padL - 6}
                  y={yFor(p) + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill="#94a3b8"
                >
                  {p}
                </text>
              </g>
            ))}

            {/* X axis labels */}
            {[24, 18, 12, 6, 0].map((hr) => (
              <g key={hr}>
                <line
                  x1={xFor(hr)}
                  y1={h - padB}
                  x2={xFor(hr)}
                  y2={h - padB + 4}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                />
                <text
                  x={xFor(hr)}
                  y={h - padB + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#94a3b8"
                >
                  {hr === 0 ? "now" : `${hr}h ago`}
                </text>
              </g>
            ))}

            {/* Threshold line at pain 7 */}
            <line
              x1={padL}
              y1={yFor(7)}
              x2={w - padR}
              y2={yFor(7)}
              stroke="#fca5a5"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={w - padR}
              y={yFor(7) - 4}
              textAnchor="end"
              fontSize={10}
              fill="#dc2626"
            >
              alert ≥ 7
            </text>

            {/* Med marker vertical lines */}
            {meds.map((m, i) => (
              <g key={`med-${i}`}>
                <line
                  x1={xFor(m.hoursAgo)}
                  y1={padT}
                  x2={xFor(m.hoursAgo)}
                  y2={h - padB}
                  stroke="#a78bfa"
                  strokeWidth={2}
                  strokeDasharray="2 3"
                />
                <circle
                  cx={xFor(m.hoursAgo)}
                  cy={padT - 4}
                  r={6}
                  fill="#a78bfa"
                />
                <text
                  x={xFor(m.hoursAgo)}
                  y={padT - 1}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill="white"
                >
                  Rx
                </text>
              </g>
            ))}

            {/* Pain line */}
            <path
              d={pathD}
              fill="none"
              stroke="#475569"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {painPoints.map((p, i) => (
              <circle
                key={`pt-${i}`}
                cx={xFor(p.hoursAgo)}
                cy={yFor(p.pain)}
                r={p.isFollowUp ? 5 : 4}
                fill={p.isFollowUp ? "#10b981" : painColor(p.pain)}
                stroke="white"
                strokeWidth={p.isFollowUp ? 2 : 1.5}
              />
            ))}
          </svg>

          <div className="mt-2 rounded-md bg-violet-50 px-4 py-2 text-sm text-slate-700 ring-1 ring-inset ring-violet-200">
            <span className="font-medium text-violet-900">
              Reading the chart:
            </span>{" "}
            Both PRN doses brought pain from 6–7/10 down to 3–4/10 within an
            hour. Current 15 mg morphine is effective; no order change needed.
          </div>
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-end justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Symptom log · timestamped
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Listen to exactly what the patient said. No need to call the
              caregiver to ask.
            </p>
          </div>
          <select className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
            <option>Last 48 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </header>
        <ol className="divide-y divide-slate-100">
          {symptomLog.map((entry, idx) => {
            const showDay = idx === 0 || symptomLog[idx - 1].day !== entry.day;
            return (
              <li key={entry.id}>
                {showDay && (
                  <div className="bg-slate-50 px-6 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {entry.day}
                  </div>
                )}
                <div className="grid grid-cols-[5rem_1fr_auto] gap-4 px-6 py-4">
                  <div className="pt-0.5 text-sm font-semibold tabular-nums text-slate-700">
                    {entry.time}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {entry.type}
                      </span>
                      <span
                        className={`text-base font-bold tabular-nums ${painTextColor(entry.severity)}`}
                      >
                        {entry.severity}/10
                      </span>
                      {entry.location && (
                        <span className="text-sm text-slate-500">
                          · {entry.location}
                        </span>
                      )}
                      {entry.alert && (
                        <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-200">
                          ALERT
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {entry.description}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Reported by {entry.reportedBy}
                    </p>

                    {entry.med && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-violet-50 px-3 py-2 text-sm ring-1 ring-inset ring-violet-200">
                        <span className="font-medium text-violet-900">
                          Rx:
                        </span>
                        <span className="text-slate-700">
                          {entry.med.name} {entry.med.dose} {entry.med.route}
                        </span>
                        {entry.followUpSeverity != null && (
                          <span className="ml-auto flex items-center gap-1 text-xs">
                            <span className="text-slate-500">Follow-up:</span>
                            <span
                              className={`font-semibold tabular-nums ${painTextColor(entry.followUpSeverity)}`}
                            >
                              {entry.followUpSeverity}/10
                            </span>
                            <span className="text-emerald-700 font-semibold">
                              (Δ −{entry.severity - entry.followUpSeverity})
                            </span>
                            <span className="text-slate-400">
                              · {entry.followUpTime}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {entry.hasVoice && entry.voiceTranscript && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label="Play voice recording"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-4 w-4"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-medium">Voice note</span>
                              <span>·</span>
                              <span className="tabular-nums">
                                {entry.voiceDuration}
                              </span>
                              <span>·</span>
                              <span>STT {entry.voiceConfidence}</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                              <div className="h-full w-0 rounded-full bg-slate-900" />
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-sm italic text-slate-700">
                          “{entry.voiceTranscript}”
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-end justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Medication effectiveness · last 48 hours
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Did each PRN dose actually work? Use this to titrate the order.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Adjust med orders
          </button>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-2.5">Given</th>
                <th className="px-4 py-2.5">Medication</th>
                <th className="px-4 py-2.5">For</th>
                <th className="px-4 py-2.5 text-right">Before</th>
                <th className="px-4 py-2.5 text-right">After</th>
                <th className="px-4 py-2.5 text-right">Δ</th>
                <th className="px-4 py-2.5">Follow-up</th>
                <th className="px-4 py-2.5">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {medEffectiveness.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-3">
                    <div className="text-sm font-medium text-slate-900">
                      {m.time}
                    </div>
                    <div className="text-xs text-slate-500">{m.day}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{m.med}</td>
                  <td className="px-4 py-3 text-slate-600">{m.indication}</td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${painTextColor(m.before)}`}
                  >
                    {m.before}/10
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${painTextColor(m.after)}`}
                  >
                    {m.after}/10
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                    −{m.before - m.after}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {m.followUpAt}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {m.effective ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        ✓ Effective
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        ⚠ Marginal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-end justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Clinical notes
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Most recent first
            </p>
          </div>
          <button
            type="button"
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            + Add note after this visit
          </button>
        </header>
        <ul className="divide-y divide-slate-100">
          {clinicalNotes.map((n) => (
            <li key={n.id} className="px-6 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
                    {n.type}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {n.author}
                  </span>
                  <span className="text-xs text-slate-500">
                    {n.date} · {n.time}
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-500">{n.id}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
