type StaffRole = "RN" | "MD" | "NP" | "LCSW" | "Chaplain" | "Pharmacist" | "Admin";

type Staff = {
  id: string;
  name: string;
  role: StaffRole;
  email: string;
  phone: string;
  credentials: string;
  org: string;
  active: boolean;
  permissions: string[];
};

const staff: Staff[] = [
  { id: "S-201", name: "Sarah Chen", role: "RN", email: "schen@davishospice.org", phone: "(530) 555-0201", credentials: "BSN, CHPN", org: "Davis Hospice", active: true, permissions: ["View patients", "Edit medications", "Review recordings"] },
  { id: "S-202", name: "James Reid, MD", role: "MD", email: "jreid@davishospice.org", phone: "(530) 555-0202", credentials: "MD, HMDC", org: "Davis Hospice", active: true, permissions: ["View patients", "Edit medications", "Review recordings", "Manage users"] },
  { id: "S-203", name: "Maria Lopez", role: "RN", email: "mlopez@davishospice.org", phone: "(530) 555-0203", credentials: "BSN, CHPN", org: "Davis Hospice", active: true, permissions: ["View patients", "Edit medications", "Review recordings"] },
  { id: "S-204", name: "Linda Park", role: "LCSW", email: "lpark@davishospice.org", phone: "(530) 555-0204", credentials: "LCSW, MSW", org: "Davis Hospice", active: true, permissions: ["View patients", "Review recordings"] },
  { id: "S-205", name: "Thomas Greene", role: "Chaplain", email: "tgreene@davishospice.org", phone: "(530) 555-0205", credentials: "M.Div., BCC", org: "Davis Hospice", active: true, permissions: ["View patients"] },
  { id: "S-206", name: "James Park", role: "RN", email: "jpark@sutterhc.org", phone: "(530) 555-0206", credentials: "BSN, CHPN", org: "Sutter Home Care", active: true, permissions: ["View patients", "Edit medications", "Review recordings"] },
  { id: "S-207", name: "Tomoko Yamada", role: "RN", email: "tyamada@davishospice.org", phone: "(530) 555-0207", credentials: "MSN, CHPN", org: "Davis Hospice", active: true, permissions: ["View patients", "Edit medications", "Review recordings", "Generate reports"] },
  { id: "S-208", name: "Priya Desai, NP", role: "NP", email: "pdesai@sutterhc.org", phone: "(530) 555-0208", credentials: "MSN, FNP-BC", org: "Sutter Home Care", active: true, permissions: ["View patients", "Edit medications", "Review recordings"] },
  { id: "S-209", name: "Daniel Wong", role: "Pharmacist", email: "dwong@davispharmacy.com", phone: "(530) 555-0100", credentials: "PharmD", org: "Davis Hospice", active: true, permissions: ["View patients", "Edit medications"] },
  { id: "S-210", name: "Rachel Kim", role: "Admin", email: "rkim@davishospice.org", phone: "(530) 555-0210", credentials: "MHA", org: "Davis Hospice", active: true, permissions: ["View patients", "Manage users", "Generate reports"] },
  { id: "S-211", name: "Brian Foster", role: "RN", email: "bfoster@sutterhc.org", phone: "(530) 555-0211", credentials: "BSN", org: "Sutter Home Care", active: false, permissions: [] },
];

const roleStyles: Record<StaffRole, string> = {
  RN: "bg-blue-100 text-blue-700 ring-blue-600/20",
  MD: "bg-violet-100 text-violet-700 ring-violet-600/20",
  NP: "bg-violet-100 text-violet-700 ring-violet-600/20",
  LCSW: "bg-teal-100 text-teal-700 ring-teal-600/20",
  Chaplain: "bg-rose-100 text-rose-700 ring-rose-600/20",
  Pharmacist: "bg-sky-100 text-sky-700 ring-sky-600/20",
  Admin: "bg-slate-100 text-slate-700 ring-slate-600/20",
};

export default function StaffPage() {
  const total = staff.length;
  const byRole = staff.reduce<Record<string, number>>((acc, s) => {
    acc[s.role] = (acc[s.role] ?? 0) + 1;
    return acc;
  }, {});
  const active = staff.filter((s) => s.active).length;
  const orgs = new Set(staff.map((s) => s.org)).size;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Care Staff</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organization members across all hospice agencies. Manage roles,
            credentials, and permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search by name, email, or credential…"
            className="w-72 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Filters
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Invite Staff
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Staff
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {total}
          </div>
          <div className="mt-1 text-xs text-slate-500">Across {orgs} orgs</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Active
          </div>
          <div className="mt-1 text-3xl font-semibold text-emerald-700">
            {active}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {total - active} inactive
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Nurses (RN/NP)
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {(byRole.RN ?? 0) + (byRole.NP ?? 0)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Field clinical</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Physicians
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {byRole.MD ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">Hospice MDs</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Staff ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Credentials</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Org</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Permissions</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-500">
                    {s.id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
                    {s.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${roleStyles[s.role]}`}
                    >
                      {s.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-600">
                    {s.credentials}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {s.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-600">
                    {s.phone}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {s.org}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {s.active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {s.permissions.length === 0 ? (
                      "—"
                    ) : (
                      <span title={s.permissions.join(", ")}>
                        {s.permissions.length} perm
                        {s.permissions.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
