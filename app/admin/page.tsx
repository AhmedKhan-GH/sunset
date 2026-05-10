import Link from "next/link";

type PatientStatus = "urgent" | "attention" | "stable";

type FacilityPatient = {
  id: string;
  name: string;
  status: PatientStatus;
  pain: number;
  nurse: string;
  lastLog: string;
  action: string;
};

type NurseLoad = {
  nurse: string;
  patients: number;
  urgent: number;
  overdue: number;
};

const priorityPatients: FacilityPatient[] = [
  {
    id: "P-1052",
    name: "Beatrice Thornton",
    status: "urgent",
    pain: 9,
    nurse: "J. Park, RN",
    lastLog: "3 min ago",
    action: "Pain spike after medication",
  },
  {
    id: "P-1048",
    name: "Alice Freeman",
    status: "urgent",
    pain: 8,
    nurse: "J. Park, RN",
    lastLog: "5 min ago",
    action: "Breathing distress check-in",
  },
  {
    id: "P-1044",
    name: "Margaret Chen",
    status: "urgent",
    pain: 9,
    nurse: "J. Park, RN",
    lastLog: "8 min ago",
    action: "Family requested callback",
  },
  {
    id: "P-1043",
    name: "Robert Hartley",
    status: "attention",
    pain: 7,
    nurse: "M. Lopez, RN",
    lastLog: "1 hr ago",
    action: "Pain above care-plan threshold",
  },
  {
    id: "P-1049",
    name: "Henry Mendoza",
    status: "attention",
    pain: 6,
    nurse: "T. Yamada, RN",
    lastLog: "1 hr ago",
    action: "Missed evening symptom log",
  },
];

const nurseLoads: NurseLoad[] = [
  { nurse: "J. Park, RN", patients: 4, urgent: 3, overdue: 1 },
  { nurse: "M. Lopez, RN", patients: 4, urgent: 0, overdue: 2 },
  { nurse: "S. Chen, RN", patients: 4, urgent: 0, overdue: 0 },
  { nurse: "T. Yamada, RN", patients: 3, urgent: 0, overdue: 1 },
];

const organizations = [
  { id: "ORG-01", name: "Davis Hospice", createdAt: "May 2026" },
  { id: "ORG-02", name: "Sutter Home Care", createdAt: "May 2026" },
];

const statusStyles: Record<PatientStatus, string> = {
  urgent: "bg-red-100 text-red-700 ring-red-600/20",
  attention: "bg-amber-100 text-amber-700 ring-amber-600/20",
  stable: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
};

export default async function AdminPage() {
  const activePatients = 14;
  const urgent = priorityPatients.filter((p) => p.status === "urgent").length;
  const attention = priorityPatients.filter(
    (p) => p.status === "attention",
  ).length;
  const overdue = nurseLoads.reduce((sum, nurse) => sum + nurse.overdue, 0);

  const metrics = [
    {
      label: "Active Patients",
      value: activePatients,
      detail: "Across all nurses",
      className: "text-slate-900",
    },
    {
      label: "Urgent Flags",
      value: urgent,
      detail: "Facility-wide crisis watch",
      className: "text-red-700",
    },
    {
      label: "Needs Attention",
      value: attention,
      detail: "Pain, stale logs, or follow-up",
      className: "text-amber-700",
    },
    {
      label: "Overdue Follow-ups",
      value: overdue,
      detail: `${nurseLoads.length} nurses on shift`,
      className: "text-slate-900",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Organization command center
            </p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight text-slate-900">
              Facility-wide hospice operations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              A management view for all patients, urgent flags, nurse
              assignments, and team response pressure.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/patients"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              View all patients
            </Link>
            <Link
              href="/admin/staff"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Manage staff
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {metric.label}
            </div>
            <div className={`mt-2 text-4xl font-semibold ${metric.className}`}>
              {metric.value}
            </div>
            <div className="mt-1 text-xs text-slate-500">{metric.detail}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Highest-priority patients
              </h2>
              <p className="text-xs text-slate-500">
                Who is in crisis, who is assigned, and what needs action
              </p>
            </div>
            <Link
              href="/admin/patients"
              className="text-sm font-semibold text-slate-700 hover:text-slate-950"
            >
              Open census
            </Link>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Pain</th>
                  <th className="px-4 py-3">Assigned Nurse</th>
                  <th className="px-4 py-3">Last Log</th>
                  <th className="px-4 py-3">Action Needed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorityPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {patient.name}
                      </div>
                      <div className="font-mono text-xs text-slate-500">
                        {patient.id}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles[patient.status]}`}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-lg font-semibold tabular-nums text-red-700">
                      {patient.pain}/10
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {patient.nurse}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {patient.lastLog}
                    </td>
                    <td className="min-w-64 px-4 py-3 text-slate-700">
                      {patient.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              Nurse workload
            </h2>
            <p className="text-xs text-slate-500">
              Assignment balance and follow-up pressure
            </p>
          </header>
          <ul className="divide-y divide-slate-100">
            {nurseLoads.map((nurse) => (
              <li key={nurse.nurse} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {nurse.nurse}
                    </p>
                    <p className="text-xs text-slate-500">
                      {nurse.patients} patients assigned
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">
                      {nurse.urgent} urgent
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                      {nurse.overdue} overdue
                    </span>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-800"
                    style={{
                      width: `${Math.min(100, nurse.patients * 18 + nurse.urgent * 8)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Facility readiness
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-2xl font-semibold text-emerald-700">91%</div>
              <div className="text-xs text-slate-500">Logs reviewed today</div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-2xl font-semibold text-slate-900">
                11 min
              </div>
              <div className="text-xs text-slate-500">Urgent avg response</div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-2xl font-semibold text-amber-700">4</div>
              <div className="text-xs text-slate-500">Open escalations</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Organizations
          </h2>
          <form className="mt-4 flex gap-2">
            <input
              name="name"
              type="text"
              placeholder="Organization name"
              required
              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <button
              type="button"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Create
            </button>
          </form>
          <ul className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
            {organizations.map((org) => (
              <li
                key={org.id}
                className="flex items-center justify-between px-3 py-2.5"
              >
                <span className="font-medium text-slate-900">{org.name}</span>
                <span className="text-xs text-slate-500">
                  {org.createdAt}
                </span>
              </li>
            ))}
            {organizations.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-slate-500">
                No organizations yet.
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
