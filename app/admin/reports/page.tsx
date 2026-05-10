const symptomFrequency = [
  { symptom: "Pain", count: 412, percent: 38 },
  { symptom: "Anxiety", count: 187, percent: 17 },
  { symptom: "Shortness of Breath", count: 156, percent: 14 },
  { symptom: "Nausea / Vomiting", count: 128, percent: 12 },
  { symptom: "Constipation", count: 92, percent: 8 },
  { symptom: "Congestion", count: 67, percent: 6 },
  { symptom: "Fever", count: 51, percent: 5 },
];

const medEffectiveness = [
  { name: "Morphine sulfate", indication: "Pain", n: 312, avgDelta: -3.4, percentImproved: 89 },
  { name: "Lorazepam", indication: "Anxiety", n: 142, avgDelta: -2.1, percentImproved: 76 },
  { name: "Ondansetron", indication: "Nausea", n: 98, avgDelta: -3.0, percentImproved: 84 },
  { name: "Lactulose", indication: "Constipation", n: 64, avgDelta: -2.5, percentImproved: 71 },
  { name: "Acetaminophen", indication: "Fever", n: 47, avgDelta: -2.2, percentImproved: 81 },
];

const responseTimes = [
  { tier: "Urgent (pain ≥ 9)", avg: "4 min", p90: "8 min" },
  { tier: "High (pain 7–8)", avg: "11 min", p90: "22 min" },
  { tier: "Moderate (pain 4–6)", avg: "28 min", p90: "55 min" },
  { tier: "Low (pain ≤ 3)", avg: "1 hr 12 min", p90: "3 hr 5 min" },
];

const alertsPerPatient = [
  { patient: "Chen, Margaret (P-1044)", alerts: 14, status: "urgent" as const },
  { patient: "Thornton, Beatrice (P-1052)", alerts: 11, status: "urgent" as const },
  { patient: "Freeman, Alice (P-1048)", alerts: 9, status: "urgent" as const },
  { patient: "Hartley, Robert (P-1043)", alerts: 7, status: "attention" as const },
  { patient: "Patel, Charles (P-1053)", alerts: 6, status: "attention" as const },
  { patient: "Mendoza, Henry (P-1049)", alerts: 5, status: "attention" as const },
  { patient: "Vasquez, Dorothy (P-1046)", alerts: 4, status: "attention" as const },
];

const statusDot = {
  urgent: "bg-red-500",
  attention: "bg-amber-500",
  stable: "bg-emerald-500",
};

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Last 30 days · all hospice orgs · 14 active patients ·{" "}
            <span className="font-medium text-slate-700">1,093</span> symptom
            records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
            <option>Custom range…</option>
          </select>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Avg Pain Score
          </div>
          <div className="mt-1 text-3xl font-semibold text-amber-700">
            5.2
          </div>
          <div className="mt-1 text-xs text-slate-500">
            <span className="text-emerald-700">↓ 0.4</span> vs prior 30d
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Alerts
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            87
          </div>
          <div className="mt-1 text-xs text-slate-500">
            6.2 per patient avg
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Med Effectiveness
          </div>
          <div className="mt-1 text-3xl font-semibold text-emerald-700">
            82%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Improved on follow-up
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Avg Response
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            22 min
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Alert → nurse ack
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Voice Logs
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            1,418
          </div>
          <div className="mt-1 text-xs text-slate-500">
            93% STT confidence
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Most Frequent Symptoms
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Across all patients, last 30 days
            </p>
          </header>
          <div className="flex flex-col gap-3 p-4">
            {symptomFrequency.map((s) => (
              <div key={s.symptom}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">
                    {s.symptom}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {s.count}{" "}
                    <span className="text-xs">({s.percent}%)</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${s.percent * 2.6}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Medication Effectiveness
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Avg severity drop after dose, 60-min follow-up
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Medication</th>
                  <th className="px-4 py-2.5">For</th>
                  <th className="px-4 py-2.5 text-right">N</th>
                  <th className="px-4 py-2.5 text-right">Δ Severity</th>
                  <th className="px-4 py-2.5 text-right">% Improved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medEffectiveness.map((m) => (
                  <tr key={m.name}>
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-900">
                      {m.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                      {m.indication}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-600">
                      {m.n}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums font-semibold text-emerald-700">
                      {m.avgDelta.toFixed(1)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-900">
                      {m.percentImproved}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Response Times
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              From alert trigger to nurse acknowledgement
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Severity Tier</th>
                  <th className="px-4 py-2.5 text-right">Avg</th>
                  <th className="px-4 py-2.5 text-right">P90</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {responseTimes.map((r) => (
                  <tr key={r.tier}>
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-900">
                      {r.tier}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-700">
                      {r.avg}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-500">
                      {r.p90}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Alerts per Patient (Top 7)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Patients generating the most alerts in the period
            </p>
          </header>
          <ul className="divide-y divide-slate-100">
            {alertsPerPatient.map((a) => (
              <li
                key={a.patient}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${statusDot[a.status]}`}
                  />
                  <span className="text-sm text-slate-900">{a.patient}</span>
                </div>
                <span className="tabular-nums text-sm font-semibold text-slate-700">
                  {a.alerts}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
