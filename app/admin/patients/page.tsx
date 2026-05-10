import Link from "next/link";

type Status = "stable" | "attention" | "urgent";

type Patient = {
  id: string;
  first: string;
  last: string;
  age: number;
  diagnosis: string;
  admitted: string;
  status: Status;
  pain: number;
  lastLog: string;
  nurse: string;
  org: string;
};

const patients: Patient[] = [
  { id: "P-1042", first: "Eleanor", last: "Whitman", age: 84, diagnosis: "Stage IV breast cancer", admitted: "Mar 15", status: "stable", pain: 4, lastLog: "12 min ago", nurse: "S. Chen, RN", org: "Davis Hospice" },
  { id: "P-1043", first: "Robert", last: "Hartley", age: 79, diagnosis: "End-stage COPD", admitted: "Apr 02", status: "attention", pain: 7, lastLog: "1 hr ago", nurse: "M. Lopez, RN", org: "Davis Hospice" },
  { id: "P-1044", first: "Margaret", last: "Chen", age: 92, diagnosis: "Advanced Alzheimer's", admitted: "Feb 20", status: "urgent", pain: 9, lastLog: "8 min ago", nurse: "J. Park, RN", org: "Sutter Home Care" },
  { id: "P-1045", first: "James", last: "O'Connor", age: 76, diagnosis: "Pancreatic cancer", admitted: "Apr 22", status: "stable", pain: 3, lastLog: "32 min ago", nurse: "S. Chen, RN", org: "Davis Hospice" },
  { id: "P-1046", first: "Dorothy", last: "Vasquez", age: 88, diagnosis: "CHF, NYHA IV", admitted: "Mar 30", status: "attention", pain: 5, lastLog: "2 hr ago", nurse: "M. Lopez, RN", org: "Sutter Home Care" },
  { id: "P-1047", first: "Samuel", last: "Brennan", age: 81, diagnosis: "Lung cancer w/ mets", admitted: "Apr 08", status: "stable", pain: 2, lastLog: "45 min ago", nurse: "T. Yamada, RN", org: "Davis Hospice" },
  { id: "P-1048", first: "Alice", last: "Freeman", age: 73, diagnosis: "ALS", admitted: "Mar 03", status: "urgent", pain: 8, lastLog: "5 min ago", nurse: "J. Park, RN", org: "Sutter Home Care" },
  { id: "P-1049", first: "Henry", last: "Mendoza", age: 90, diagnosis: "ESRD, dialysis declined", admitted: "Apr 14", status: "attention", pain: 6, lastLog: "1 hr ago", nurse: "T. Yamada, RN", org: "Davis Hospice" },
  { id: "P-1050", first: "Florence", last: "Becker", age: 86, diagnosis: "Glioblastoma", admitted: "Mar 25", status: "stable", pain: 4, lastLog: "20 min ago", nurse: "S. Chen, RN", org: "Sutter Home Care" },
  { id: "P-1051", first: "Walter", last: "Yoshida", age: 78, diagnosis: "Stage IV prostate", admitted: "Apr 11", status: "stable", pain: 3, lastLog: "55 min ago", nurse: "M. Lopez, RN", org: "Davis Hospice" },
  { id: "P-1052", first: "Beatrice", last: "Thornton", age: 82, diagnosis: "End-stage liver disease", admitted: "Mar 18", status: "urgent", pain: 9, lastLog: "3 min ago", nurse: "J. Park, RN", org: "Davis Hospice" },
  { id: "P-1053", first: "Charles", last: "Patel", age: 75, diagnosis: "Stage IV colon cancer", admitted: "Apr 27", status: "attention", pain: 7, lastLog: "40 min ago", nurse: "T. Yamada, RN", org: "Sutter Home Care" },
  { id: "P-1054", first: "Vivian", last: "Larsen", age: 89, diagnosis: "End-stage CHF", admitted: "Feb 14", status: "stable", pain: 4, lastLog: "1 hr ago", nurse: "S. Chen, RN", org: "Davis Hospice" },
  { id: "P-1055", first: "Edgar", last: "Ross", age: 80, diagnosis: "Mesothelioma", admitted: "Apr 19", status: "attention", pain: 6, lastLog: "15 min ago", nurse: "M. Lopez, RN", org: "Sutter Home Care" },
];

const statusStyles: Record<Status, string> = {
  stable: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  attention: "bg-amber-100 text-amber-700 ring-amber-600/20",
  urgent: "bg-red-100 text-red-700 ring-red-600/20",
};

const statusLabel: Record<Status, string> = {
  stable: "Stable",
  attention: "Attention",
  urgent: "Urgent",
};

function painColor(pain: number) {
  if (pain >= 7) return "text-red-700";
  if (pain >= 4) return "text-amber-700";
  return "text-emerald-700";
}

export default function PatientsPage() {
  const total = patients.length;
  const stable = patients.filter((p) => p.status === "stable").length;
  const attention = patients.filter((p) => p.status === "attention").length;
  const urgent = patients.filter((p) => p.status === "urgent").length;
  const orgsActive = new Set(patients.map((p) => p.org)).size;

  const kpis = [
    {
      label: "Total Patients",
      value: total,
      sub: `Across ${orgsActive} hospice ${orgsActive === 1 ? "org" : "orgs"}`,
    },
    {
      label: "Stable",
      value: stable,
      sub: `${Math.round((stable / total) * 100)}% of census`,
      accent: "text-emerald-700",
    },
    {
      label: "Need Attention",
      value: attention,
      sub: "Pain ≥ 5 or stale logs",
      accent: "text-amber-700",
    },
    {
      label: "Urgent",
      value: urgent,
      sub: "Pain ≥ 7, escalate now",
      accent: "text-red-700",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">
            All hospice patients across organizations. Sortable spreadsheet
            view for clinical review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search by name, ID, or diagnosis…"
            className="w-72 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Filters
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            + New Patient
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {kpi.label}
            </div>
            <div
              className={`mt-1 text-3xl font-semibold ${kpi.accent ?? "text-slate-900"}`}
            >
              {kpi.value}
            </div>
            <div className="mt-1 text-xs text-slate-500">{kpi.sub}</div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Diagnosis</th>
                <th className="px-4 py-3">Org</th>
                <th className="px-4 py-3">Admitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Pain</th>
                <th className="px-4 py-3">Last Log</th>
                <th className="px-4 py-3">Primary Nurse</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-500">
                    {p.id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="font-medium text-slate-900">
                      {p.last}, {p.first}
                    </div>
                    <div className="text-xs text-slate-500">Age {p.age}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{p.diagnosis}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {p.org}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {p.admitted}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[p.status]}`}
                    >
                      {statusLabel[p.status]}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums ${painColor(p.pain)}`}
                  >
                    {p.pain}/10
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {p.lastLog}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                    {p.nurse}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <Link
                      href={`/admin/patients/${p.id}`}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <span>
            Showing {patients.length} of {patients.length}
          </span>
          <span>Last refreshed just now</span>
        </div>
      </section>
    </div>
  );
}
