import Link from "next/link";
import { alerts, type Alert } from "../data";

const severityStyles: Record<Alert["severity"], string> = {
  high: "bg-red-100 text-red-700 ring-red-600/20",
  medium: "bg-amber-100 text-amber-700 ring-amber-600/20",
  low: "bg-slate-100 text-slate-700 ring-slate-600/20",
};

const severityLabel: Record<Alert["severity"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function AlertsPage() {
  const newAlerts = alerts.filter((a) => a.status === "new");
  const ackedAlerts = alerts.filter((a) => a.status !== "new");

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Alerts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Auto-flagged events from your caseload — pain spikes, missed meds,
            stale logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option>All severities</option>
            <option>High only</option>
            <option>Medium and above</option>
          </select>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Mark all read
          </button>
        </div>
      </div>

      {newAlerts.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            New
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {newAlerts.length}
            </span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {newAlerts.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-start gap-4 px-6 py-4 hover:bg-slate-50"
                >
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${severityStyles[a.severity]}`}
                  >
                    {severityLabel[a.severity]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <Link
                        href={`/practitioner/patients/${a.patientId}`}
                        className="text-base font-semibold text-slate-900 hover:underline"
                      >
                        {a.patientName}
                      </Link>
                      <span className="font-mono text-xs text-slate-500">
                        {a.patientId}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-slate-900">
                      {a.trigger}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{a.detail}</p>
                    <div className="mt-2 text-xs text-slate-500">
                      <span className="font-mono">{a.id}</span> · Triggered at{" "}
                      {a.time} · {a.ago}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Link
                      href={`/practitioner/patients/${a.patientId}`}
                      className="rounded-md bg-brand px-3 py-1.5 text-center text-xs font-semibold text-white hover:brightness-110"
                    >
                      Open chart
                    </Link>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Acknowledge
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {ackedAlerts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Acknowledged · Last 24 hours
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {ackedAlerts.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-start gap-4 px-6 py-4"
                >
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium opacity-70 ring-1 ring-inset ${severityStyles[a.severity]}`}
                  >
                    {severityLabel[a.severity]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <Link
                        href={`/practitioner/patients/${a.patientId}`}
                        className="text-sm font-semibold text-slate-700 hover:underline"
                      >
                        {a.patientName}
                      </Link>
                      <span className="text-xs text-slate-500">
                        — {a.trigger}
                      </span>
                    </div>
                    {a.acknowledgedBy && (
                      <div className="mt-1 text-xs text-slate-500">
                        ✓ Acknowledged by {a.acknowledgedBy}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
