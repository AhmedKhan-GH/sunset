import Link from "next/link";
import { caseload, practitioner, type CaseloadStatus } from "./data";

const statusStyles: Record<CaseloadStatus, string> = {
  stable: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  attention: "bg-amber-100 text-amber-700 ring-amber-600/20",
  urgent: "bg-red-100 text-red-700 ring-red-600/20",
};

const statusLabel: Record<CaseloadStatus, string> = {
  stable: "Stable",
  attention: "Attention",
  urgent: "Urgent",
};

function painColor(pain: number) {
  if (pain >= 7) return "text-red-700";
  if (pain >= 4) return "text-amber-700";
  return "text-emerald-700";
}

export default function CaseloadPage() {
  const total = caseload.length;
  const urgent = caseload.filter((p) => p.status === "urgent").length;
  const attention = caseload.filter((p) => p.status === "attention").length;
  const stable = caseload.filter((p) => p.status === "stable").length;
  const flagged = caseload.filter((p) => p.flag).length;

  // Sort: urgent → attention → stable, then by pain desc
  const sorted = [...caseload].sort((a, b) => {
    const order: Record<CaseloadStatus, number> = { urgent: 0, attention: 1, stable: 2 };
    if (order[a.status] !== order[b.status]) {
      return order[a.status] - order[b.status];
    }
    return b.pain - a.pain;
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Good morning, {practitioner.firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} patients in your caseload · {flagged} need your attention
            this morning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200">
            <option>Sort: Most urgent first</option>
            <option>Sort: Last log time</option>
            <option>Sort: Name (A-Z)</option>
          </select>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Filter
          </button>
        </div>
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total caseload
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {total}
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-red-700">
            Urgent
          </div>
          <div className="mt-1 text-3xl font-semibold text-red-700">
            {urgent}
          </div>
          <div className="mt-1 text-xs text-slate-500">Pain ≥ 7 or escalation</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">
            Attention
          </div>
          <div className="mt-1 text-3xl font-semibold text-amber-700">
            {attention}
          </div>
          <div className="mt-1 text-xs text-slate-500">Stale logs or symptoms</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Stable
          </div>
          <div className="mt-1 text-3xl font-semibold text-emerald-700">
            {stable}
          </div>
          <div className="mt-1 text-xs text-slate-500">Symptoms controlled</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Diagnosis</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Pain</th>
                <th className="px-4 py-3">Last log</th>
                <th className="px-4 py-3">Alerts</th>
                <th className="px-4 py-3">Next visit</th>
                <th className="px-4 py-3" aria-label="Action" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {p.last}, {p.first}
                    </div>
                    <div className="font-mono text-xs text-slate-500">
                      {p.id} · Age {p.age}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.diagnosis}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[p.status]}`}
                    >
                      {statusLabel[p.status]}
                    </span>
                    {p.flag && (
                      <div className="mt-1 text-xs text-slate-600">
                        ⚑ {p.flag}
                      </div>
                    )}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right text-base font-semibold tabular-nums ${painColor(p.pain)}`}
                  >
                    {p.pain}/10
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {p.lastLog}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {p.alertsCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                        {p.alertsCount} new
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {p.nextVisit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link
                      href={`/practitioner/patients/${p.id}`}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Open chart →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
