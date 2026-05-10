import Link from "next/link";

const patient = {
  id: "P-1042",
  first: "Eleanor",
  last: "Whitman",
  dob: "1942-04-12",
  age: 84,
  gender: "Female",
  language: "English",
  address: "1248 Oak Lane, Davis CA 95616",
  phone: "(530) 555-0142",
  org: "Davis Hospice",

  primaryDiagnosis: "Metastatic breast cancer (Stage IV, ER+/PR+/HER2−)",
  secondaryDiagnoses: ["Osteoporosis", "Hypertension", "Type 2 Diabetes"],
  allergies: ["Penicillin (rash)", "Sulfa drugs"],
  hospiceAdmission: "Mar 15, 2026",
  hospiceDay: 55,
  codeStatus: "DNR / DNI",
  pps: "50%",
  baselineSymptoms: ["Bone pain", "Mild fatigue", "Decreased appetite"],

  status: "stable" as const,
  pain: 4,
  lastLog: "12 min ago",

  primaryCaregiver: {
    name: "Sarah Whitman",
    relationship: "Daughter",
    phone: "(530) 555-0167",
  },
  secondaryCaregiver: {
    name: "Michael Whitman",
    relationship: "Son",
    phone: "(530) 555-0189",
  },

  team: {
    nurse: "Sarah Chen, RN",
    physician: "Dr. James Reid, MD",
    socialWorker: "Linda Park, LCSW",
    chaplain: "Rev. Thomas Greene",
    pharmacy: "Davis Hospice Pharmacy",
    pharmacyPhone: "(530) 555-0100",
  },

  device: {
    id: "DEV-44821",
    serial: "SN-44821",
    model: 'iPad Pro 11"',
    assignedDate: "Mar 15, 2026",
    lastSync: "12 min ago",
    status: "Active",
  },
};

const medications = [
  { name: "Morphine sulfate", indication: "Pain (PRN)", dose: "15 mg", route: "Oral", frequency: "q4h PRN", maxDaily: "90 mg" },
  { name: "Lorazepam", indication: "Anxiety (PRN)", dose: "0.5 mg", route: "Sublingual", frequency: "q6h PRN", maxDaily: "2 mg" },
  { name: "Ondansetron", indication: "Nausea (PRN)", dose: "4 mg", route: "Oral", frequency: "q8h PRN", maxDaily: "16 mg" },
  { name: "Lactulose", indication: "Constipation", dose: "30 mL", route: "Oral", frequency: "Daily", maxDaily: "60 mL" },
  { name: "Acetaminophen", indication: "Fever / mild pain", dose: "650 mg", route: "Oral", frequency: "q6h PRN", maxDaily: "3 g" },
];

type SymptomRecord = {
  id: string;
  time: string;
  type: string;
  severity: number;
  location: string;
  description: string;
  med: string;
  followUp: { time: string; severity: number | null };
  alert: boolean;
  reportedBy: string;
};

const symptoms: SymptomRecord[] = [
  {
    id: "SR-9182",
    time: "May 8, 11:42 PM",
    type: "Pain",
    severity: 7,
    location: "Abdomen",
    description: "Sharp, cramping",
    med: "Morphine 15 mg PO",
    followUp: { time: "12:42 AM", severity: 4 },
    alert: false,
    reportedBy: "Sarah Whitman (daughter)",
  },
  {
    id: "SR-9181",
    time: "May 8, 6:30 AM",
    type: "Nausea/Vomiting",
    severity: 5,
    location: "—",
    description: "Mild nausea, no emesis",
    med: "Ondansetron 4 mg PO",
    followUp: { time: "7:00 AM", severity: 1 },
    alert: false,
    reportedBy: "Sarah Whitman (daughter)",
  },
  {
    id: "SR-9180",
    time: "May 7, 9:15 PM",
    type: "Pain",
    severity: 6,
    location: "Lower back",
    description: "Dull ache",
    med: "Morphine 10 mg PO",
    followUp: { time: "10:00 PM", severity: 3 },
    alert: false,
    reportedBy: "Patient",
  },
  {
    id: "SR-9179",
    time: "May 7, 2:30 PM",
    type: "Anxiety",
    severity: 3,
    location: "—",
    description: "Mild restlessness",
    med: "Music & breathing (no med)",
    followUp: { time: "3:00 PM", severity: 1 },
    alert: false,
    reportedBy: "Patient",
  },
  {
    id: "SR-9178",
    time: "May 6, 8:45 PM",
    type: "Pain",
    severity: 8,
    location: "Abdomen",
    description: "Sharp, radiating to back",
    med: "Morphine 15 mg + Lorazepam 0.5 mg",
    followUp: { time: "9:30 PM", severity: 5 },
    alert: true,
    reportedBy: "Sarah Whitman (daughter)",
  },
  {
    id: "SR-9177",
    time: "May 6, 11:20 AM",
    type: "Constipation",
    severity: 4,
    location: "—",
    description: "No BM × 2 days",
    med: "Lactulose 30 mL PO",
    followUp: { time: "(pending)", severity: null },
    alert: false,
    reportedBy: "Patient",
  },
];

const alerts = [
  {
    id: "A-2041",
    time: "May 8, 11:42 PM",
    trigger: "Pain ≥ 7 sustained",
    severity: "high",
    status: "acknowledged",
    assignedTo: "S. Chen, RN",
  },
];

const recordings = [
  {
    id: "REC-3204",
    time: "May 8, 11:42 PM",
    speaker: "Sarah Whitman (caregiver)",
    duration: "0:24",
    confidence: "94%",
    transcript:
      "She's saying her stomach hurts a lot, she rates it like a seven, it's a sharp pain, she just had her morphine an hour ago…",
  },
  {
    id: "REC-3203",
    time: "May 7, 9:15 PM",
    speaker: "Eleanor Whitman (patient)",
    duration: "0:18",
    confidence: "88%",
    transcript:
      "It's the lower back again, about a six. The morphine helped last time…",
  },
  {
    id: "REC-3202",
    time: "May 6, 8:45 PM",
    speaker: "Sarah Whitman (caregiver)",
    duration: "0:32",
    confidence: "92%",
    transcript:
      "She's in a lot of pain, it's an eight in her abdomen, she's also anxious. I'm going to give her the morphine and the lorazepam now…",
  },
];

const statusStyles = {
  stable: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  attention: "bg-amber-100 text-amber-700 ring-amber-600/20",
  urgent: "bg-red-100 text-red-700 ring-red-600/20",
};

function painColor(pain: number) {
  if (pain >= 7) return "text-red-700";
  if (pain >= 4) return "text-amber-700";
  return "text-emerald-700";
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "mt-0.5 font-mono text-sm text-slate-900"
            : "mt-0.5 text-sm text-slate-900"
        }
      >
        {children}
      </dd>
    </div>
  );
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/admin/patients"
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          ← All patients
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {patient.last}, {patient.first}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[patient.status]}`}
            >
              Stable
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-mono">{id}</span> · {patient.gender} · DOB{" "}
            {patient.dob} (Age {patient.age}) · {patient.org}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Print summary
          </button>
          <button
            type="button"
            className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Discharge
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Pain (latest)
          </div>
          <div
            className={`mt-1 text-3xl font-semibold tabular-nums ${painColor(patient.pain)}`}
          >
            {patient.pain}/10
          </div>
          <div className="mt-1 text-xs text-slate-500">{patient.lastLog}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            PPS Score
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {patient.pps}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Palliative Performance Scale
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Hospice Day
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {patient.hospiceDay}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Admitted {patient.hospiceAdmission}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Code Status
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {patient.codeStatus}
          </div>
          <div className="mt-1 text-xs text-slate-500">On file since admit</div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <aside className="flex flex-col gap-5 lg:col-span-1">
          <Card title="Demographics">
            <dl className="grid grid-cols-1 gap-3">
              <Field label="Patient ID" mono>
                {patient.id}
              </Field>
              <Field label="First Name">{patient.first}</Field>
              <Field label="Last Name">{patient.last}</Field>
              <Field label="Date of Birth">
                {patient.dob} (Age {patient.age})
              </Field>
              <Field label="Gender">{patient.gender}</Field>
              <Field label="Preferred Language">{patient.language}</Field>
              <Field label="Address">{patient.address}</Field>
              <Field label="Phone">{patient.phone}</Field>
            </dl>
          </Card>

          <Card title="Emergency Contacts">
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Primary Caregiver
                </div>
                <div className="mt-0.5 text-sm font-medium text-slate-900">
                  {patient.primaryCaregiver.name}
                </div>
                <div className="text-xs text-slate-600">
                  {patient.primaryCaregiver.relationship} ·{" "}
                  {patient.primaryCaregiver.phone}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Secondary Caregiver
                </div>
                <div className="mt-0.5 text-sm font-medium text-slate-900">
                  {patient.secondaryCaregiver.name}
                </div>
                <div className="text-xs text-slate-600">
                  {patient.secondaryCaregiver.relationship} ·{" "}
                  {patient.secondaryCaregiver.phone}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Care Team">
            <dl className="grid grid-cols-1 gap-3">
              <Field label="Assigned Nurse">{patient.team.nurse}</Field>
              <Field label="Hospice Physician">{patient.team.physician}</Field>
              <Field label="Social Worker">{patient.team.socialWorker}</Field>
              <Field label="Chaplain">{patient.team.chaplain}</Field>
              <Field label="Pharmacy">
                {patient.team.pharmacy}
                <div className="text-xs text-slate-500">
                  {patient.team.pharmacyPhone}
                </div>
              </Field>
            </dl>
          </Card>

          <Card title="Device">
            <dl className="grid grid-cols-1 gap-3">
              <Field label="Device ID" mono>
                {patient.device.id}
              </Field>
              <Field label="Serial" mono>
                {patient.device.serial}
              </Field>
              <Field label="Model">{patient.device.model}</Field>
              <Field label="Assigned">{patient.device.assignedDate}</Field>
              <Field label="Last Sync">{patient.device.lastSync}</Field>
              <Field label="Status">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  {patient.device.status}
                </span>
              </Field>
            </dl>
          </Card>
        </aside>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title="Medical Information">
            <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Primary Diagnosis
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-900">
                  {patient.primaryDiagnosis}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Secondary Diagnoses
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {patient.secondaryDiagnoses.map((dx) => (
                    <span
                      key={dx}
                      className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                    >
                      {dx}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Allergies
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {patient.allergies.map((a) => (
                    <span
                      key={a}
                      className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20"
                    >
                      ⚠ {a}
                    </span>
                  ))}
                </dd>
              </div>
              <Field label="Hospice Admission Date">
                {patient.hospiceAdmission}
              </Field>
              <Field label="Code Status">{patient.codeStatus}</Field>
              <Field label="Functional Status (PPS)">{patient.pps}</Field>
              <div className="md:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Baseline Symptoms
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {patient.baselineSymptoms.map((s) => (
                    <span
                      key={s}
                      className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                    >
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </Card>

          <Card
            title="Active Medications"
            action={
              <button
                type="button"
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                + Add medication
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-medium">Medication</th>
                    <th className="pb-2 font-medium">Indication</th>
                    <th className="pb-2 font-medium">Dose</th>
                    <th className="pb-2 font-medium">Route</th>
                    <th className="pb-2 font-medium">Frequency</th>
                    <th className="pb-2 font-medium">Max Daily</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medications.map((m) => (
                    <tr key={m.name}>
                      <td className="py-2 font-medium text-slate-900">
                        {m.name}
                      </td>
                      <td className="py-2 text-slate-600">{m.indication}</td>
                      <td className="py-2 tabular-nums text-slate-900">
                        {m.dose}
                      </td>
                      <td className="py-2 text-slate-600">{m.route}</td>
                      <td className="py-2 text-slate-600">{m.frequency}</td>
                      <td className="py-2 tabular-nums text-slate-600">
                        {m.maxDaily}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Active Alerts">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500">No active alerts.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {alerts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                          {a.severity}
                        </span>
                        <span className="text-sm font-medium text-slate-900">
                          {a.trigger}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        <span className="font-mono">{a.id}</span> · {a.time} ·
                        Assigned to {a.assignedTo}
                      </div>
                    </div>
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium capitalize text-amber-700">
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Recent Symptom Records"
            action={
              <Link
                href="#"
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                View all
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Symptom</th>
                    <th className="pb-2 font-medium">Severity</th>
                    <th className="pb-2 font-medium">Notes</th>
                    <th className="pb-2 font-medium">Med Given</th>
                    <th className="pb-2 font-medium">Follow-up</th>
                    <th className="pb-2 font-medium">Reported By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {symptoms.map((s) => (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap py-2 text-slate-600">
                        {s.time}
                        {s.alert && (
                          <span className="ml-1.5 inline-flex rounded bg-red-100 px-1 text-[10px] font-bold text-red-700">
                            !
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 font-medium text-slate-900">
                        {s.type}
                      </td>
                      <td
                        className={`whitespace-nowrap py-2 font-semibold tabular-nums ${painColor(s.severity)}`}
                      >
                        {s.severity}/10
                      </td>
                      <td className="py-2 text-slate-600">
                        {s.location !== "—" ? `${s.location} — ` : ""}
                        {s.description}
                      </td>
                      <td className="py-2 text-slate-600">{s.med}</td>
                      <td className="whitespace-nowrap py-2 text-slate-600">
                        {s.followUp.severity !== null ? (
                          <span
                            className={`font-semibold tabular-nums ${painColor(s.followUp.severity)}`}
                          >
                            {s.followUp.severity}/10
                          </span>
                        ) : (
                          <span className="text-amber-600">pending</span>
                        )}{" "}
                        <span className="text-xs text-slate-400">
                          @ {s.followUp.time}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-slate-500">
                        {s.reportedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="Recent Audio Recordings"
            action={
              <Link
                href="#"
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                View all
              </Link>
            }
          >
            <ul className="flex flex-col gap-3">
              {recordings.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Play recording ${r.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {r.speaker}
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono">{r.id}</span> · {r.time}{" "}
                          · {r.duration} · STT {r.confidence}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm italic text-slate-600">
                    “{r.transcript}”
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
