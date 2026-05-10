type AuditEntry = {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  category: "auth" | "patient" | "med" | "user" | "device" | "export";
};

const entries: AuditEntry[] = [
  { id: "L-58921", time: "May 9, 12:48 PM", actor: "S. Chen, RN", action: "Acknowledged alert", target: "A-2041 (Whitman, Eleanor)", ip: "192.168.1.42", category: "patient" },
  { id: "L-58920", time: "May 9, 12:42 PM", actor: "Sunny AI", action: "Triggered alert", target: "Whitman, Eleanor — Pain ≥ 7 sustained", ip: "system", category: "patient" },
  { id: "L-58919", time: "May 9, 11:42 AM", actor: "Sarah Whitman (caregiver)", action: "Submitted symptom log", target: "P-1042 — Pain 7/10 abdomen", ip: "10.0.4.18", category: "patient" },
  { id: "L-58918", time: "May 9, 10:15 AM", actor: "J. Reid, MD", action: "Updated medication", target: "P-1043 — Morphine dose ↑ 10mg → 15mg", ip: "192.168.1.51", category: "med" },
  { id: "L-58917", time: "May 9, 09:32 AM", actor: "R. Kim (admin)", action: "Generated report", target: "Last 30d — All orgs", ip: "192.168.1.20", category: "export" },
  { id: "L-58916", time: "May 9, 09:18 AM", actor: "M. Lopez, RN", action: "Reviewed recording", target: "REC-3204 (Whitman, Eleanor)", ip: "192.168.1.46", category: "patient" },
  { id: "L-58915", time: "May 9, 08:55 AM", actor: "admin@sunset.dev", action: "Created staff account", target: "S-211 (Brian Foster, RN)", ip: "192.168.1.10", category: "user" },
  { id: "L-58914", time: "May 9, 08:12 AM", actor: "T. Yamada, RN", action: "Signed in", target: "—", ip: "192.168.1.55", category: "auth" },
  { id: "L-58913", time: "May 9, 07:45 AM", actor: "Sarah Whitman (caregiver)", action: "Submitted symptom log", target: "P-1042 — Nausea 5/10", ip: "10.0.4.18", category: "patient" },
  { id: "L-58912", time: "May 9, 07:14 AM", actor: "iPad DEV-44821", action: "Device sync", target: "P-1042 — 6 records uploaded", ip: "10.0.4.18", category: "device" },
  { id: "L-58911", time: "May 9, 06:58 AM", actor: "J. Park, RN", action: "Discharged patient", target: "P-1039 (deceased — Apr 27)", ip: "192.168.1.49", category: "patient" },
  { id: "L-58910", time: "May 9, 06:00 AM", actor: "system", action: "Nightly backup", target: "All orgs — encrypted snapshot", ip: "system", category: "device" },
];

const categoryStyles: Record<AuditEntry["category"], string> = {
  auth: "bg-slate-100 text-slate-700",
  patient: "bg-blue-100 text-blue-700",
  med: "bg-violet-100 text-violet-700",
  user: "bg-teal-100 text-teal-700",
  device: "bg-amber-100 text-amber-700",
  export: "bg-emerald-100 text-emerald-700",
};

export default function AuditPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
          <p className="mt-1 text-sm text-slate-500">
            Immutable PHI access record. Retained 7 years per HIPAA. All
            actions tracked with actor, IP, and target.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search actor, target, or ID…"
            className="w-72 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <select className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option>All categories</option>
            <option>Auth</option>
            <option>Patient</option>
            <option>Medication</option>
            <option>User mgmt</option>
            <option>Device</option>
            <option>Export</option>
          </select>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Export
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Log ID</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-500">
                    {e.id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {e.time}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-900">
                    {e.actor}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
                    {e.action}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{e.target}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium uppercase ${categoryStyles[e.category]}`}
                    >
                      {e.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-500">
                    {e.ip}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Showing 12 of 58,921 entries · Last entry 2 minutes ago
        </div>
      </section>
    </div>
  );
}
