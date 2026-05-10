import Link from "next/link";
import { type TimelineEntry, type TimelineKind } from "../data";

const fullTimeline: TimelineEntry[] = [
  { id: "T-30", time: "12:42 AM", day: "Today, May 9", kind: "followup", title: "Pain follow-up: 4/10", detail: "Down from 7 — morphine working", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-29", time: "11:42 PM", day: "Yesterday, May 8", kind: "medication", title: "Gave Morphine 15 mg", detail: "Oral, for pain", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-28", time: "11:42 PM", day: "Yesterday, May 8", kind: "voice", title: "Voice note recorded", detail: "“She's saying her stomach hurts a lot, she rates it like a seven…”", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-27", time: "11:42 PM", day: "Yesterday, May 8", kind: "symptom", title: "Pain 7/10 — abdomen", detail: "Sharp, cramping", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-26", time: "10:00 PM", day: "Yesterday, May 8", kind: "followup", title: "Pain follow-up: 3/10", detail: "Lower back relief after morphine", by: "Eleanor (patient)" },
  { id: "T-25", time: "9:15 PM", day: "Yesterday, May 8", kind: "medication", title: "Gave Morphine 10 mg", detail: "Oral, for back pain", by: "Mark Whitman (afternoon shift)" },
  { id: "T-24", time: "9:15 PM", day: "Yesterday, May 8", kind: "symptom", title: "Pain 6/10 — lower back", detail: "Dull ache", by: "Eleanor (patient)" },
  { id: "T-23", time: "3:00 PM", day: "Yesterday, May 8", kind: "followup", title: "Anxiety follow-up: 1/10", detail: "Music & breathing helped", by: "Eleanor (patient)" },
  { id: "T-22", time: "2:30 PM", day: "Yesterday, May 8", kind: "symptom", title: "Anxiety 3/10", detail: "Mild restlessness, no med given", by: "Eleanor (patient)" },
  { id: "T-21", time: "11:15 AM", day: "Yesterday, May 8", kind: "note", title: "Care team note", detail: "Sarah Chen, RN: 'Eleanor's appetite better today. Small breakfast.'", by: "Sarah Chen, RN" },
  { id: "T-20", time: "7:00 AM", day: "Yesterday, May 8", kind: "followup", title: "Nausea follow-up: 1/10", detail: "Resolved", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-19", time: "6:30 AM", day: "Yesterday, May 8", kind: "medication", title: "Gave Ondansetron 4 mg", detail: "Oral disintegrating tablet", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-18", time: "6:30 AM", day: "Yesterday, May 8", kind: "symptom", title: "Nausea 5/10", detail: "Mild nausea, no emesis", by: "Sarah Whitman (you)", byYou: true },

  { id: "T-17", time: "9:30 PM", day: "Wed, May 7", kind: "followup", title: "Pain follow-up: 5/10", detail: "Better, but still uncomfortable", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-16", time: "8:45 PM", day: "Wed, May 7", kind: "alert", title: "Alert: Pain ≥ 7 sustained", detail: "Auto-acknowledged by S. Chen, RN at 8:48 PM", by: "Sunny AI" },
  { id: "T-15", time: "8:45 PM", day: "Wed, May 7", kind: "medication", title: "Gave Morphine 15 mg + Lorazepam 0.5 mg", detail: "Combo for breakthrough pain + anxiety", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-14", time: "8:45 PM", day: "Wed, May 7", kind: "voice", title: "Voice note recorded", detail: "“She's in a lot of pain, it's an eight, she's also anxious…”", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-13", time: "8:45 PM", day: "Wed, May 7", kind: "symptom", title: "Pain 8/10 — abdomen", detail: "Sharp, radiating to back", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-12", time: "12:00 PM", day: "Wed, May 7", kind: "followup", title: "Constipation follow-up", detail: "BM after lactulose, comfortable", by: "Eleanor (patient)" },
  { id: "T-11", time: "11:20 AM", day: "Wed, May 7", kind: "medication", title: "Gave Lactulose 30 mL", detail: "Mixed with juice", by: "Sarah Whitman (you)", byYou: true },
  { id: "T-10", time: "11:20 AM", day: "Wed, May 7", kind: "symptom", title: "Constipation 4/10", detail: "No BM × 2 days", by: "Eleanor (patient)" },
  { id: "T-09", time: "10:30 AM", day: "Wed, May 7", kind: "visit", title: "Nurse visit completed", detail: "Sarah Chen, RN — 75 min. Vitals stable. Pain regimen reviewed.", by: "Sarah Chen, RN" },

  { id: "T-08", time: "10:00 PM", day: "Tue, May 6", kind: "followup", title: "Pain follow-up: 5/10", detail: "Improved", by: "Mark Whitman (afternoon)" },
  { id: "T-07", time: "9:00 PM", day: "Tue, May 6", kind: "medication", title: "Gave Morphine 10 mg", detail: "Oral, for evening pain", by: "Mark Whitman (afternoon)" },
  { id: "T-06", time: "9:00 PM", day: "Tue, May 6", kind: "symptom", title: "Pain 7/10 — abdomen", detail: "Sharp", by: "Mark Whitman (afternoon)" },
  { id: "T-05", time: "2:00 PM", day: "Tue, May 6", kind: "note", title: "Family note", detail: "Eleanor sat in the garden for 30 min today, smiled when the cat came over.", by: "Sarah Whitman (you)", byYou: true },
];

const kindStyles: Record<TimelineKind, { bg: string; ring: string; text: string }> = {
  symptom: { bg: "bg-amber-100", ring: "ring-amber-600/20", text: "text-amber-700" },
  medication: { bg: "bg-violet-100", ring: "ring-violet-600/20", text: "text-violet-700" },
  followup: { bg: "bg-emerald-100", ring: "ring-emerald-600/20", text: "text-emerald-700" },
  voice: { bg: "bg-sky-100", ring: "ring-sky-600/20", text: "text-sky-700" },
  alert: { bg: "bg-red-100", ring: "ring-red-600/20", text: "text-red-700" },
  visit: { bg: "bg-slate-100", ring: "ring-slate-600/20", text: "text-slate-700" },
  note: { bg: "bg-slate-100", ring: "ring-slate-600/20", text: "text-slate-700" },
};

const kindIcon: Record<TimelineKind, React.ReactNode> = {
  symptom: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  medication: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="3" y="9" width="18" height="6" rx="3" />
      <path d="M12 9v6" />
    </svg>
  ),
  followup: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="m5 12 5 5 9-12" />
    </svg>
  ),
  voice: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="m12 3 10 17H2z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  ),
  visit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
};

const filterKinds: { kind: TimelineKind; label: string }[] = [
  { kind: "symptom", label: "Symptoms" },
  { kind: "medication", label: "Medications" },
  { kind: "followup", label: "Follow-ups" },
  { kind: "voice", label: "Voice notes" },
  { kind: "alert", label: "Alerts" },
  { kind: "visit", label: "Visits" },
  { kind: "note", label: "Notes" },
];

const caregivers = [
  "Sarah Whitman (you)",
  "Mark Whitman",
  "Eleanor (patient)",
  "Sarah Chen, RN",
  "Sunny AI",
];

export default function ActivityPage() {
  const counts = filterKinds.reduce<Record<string, number>>((acc, f) => {
    acc[f.kind] = fullTimeline.filter((e) => e.kind === f.kind).length;
    return acc;
  }, {});

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Activity</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every entry by every caregiver. Use filters to find what you need.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200">
            <option>Last 7 days</option>
            <option>Last 24 hours</option>
            <option>Last 30 days</option>
            <option>Custom range…</option>
          </select>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Export
          </button>
        </div>
      </div>

      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            All ({fullTimeline.length})
          </button>
          {filterKinds.map((f) => {
            const styles = kindStyles[f.kind];
            return (
              <button
                key={f.kind}
                type="button"
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${styles.bg} ${styles.ring} ${styles.text} hover:brightness-95`}
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center">
                  {kindIcon[f.kind]}
                </span>
                {f.label} ({counts[f.kind] ?? 0})
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Caregiver:
          </span>
          <select className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none">
            <option>All caregivers</option>
            {caregivers.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search activity…"
            className="ml-auto w-64 rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ol className="divide-y divide-slate-100">
          {fullTimeline.map((entry, idx) => {
            const showDay =
              idx === 0 || fullTimeline[idx - 1].day !== entry.day;
            const styles = kindStyles[entry.kind];
            return (
              <li key={entry.id}>
                {showDay && (
                  <div className="bg-slate-50 px-6 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {entry.day}
                  </div>
                )}
                <div className="flex items-start gap-4 px-6 py-3 hover:bg-slate-50">
                  <div className="w-20 shrink-0 pt-0.5 text-sm font-medium tabular-nums text-slate-500">
                    {entry.time}
                  </div>
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${styles.bg} ${styles.ring} ${styles.text}`}
                  >
                    {kindIcon[entry.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">
                      {entry.title}
                    </div>
                    <div className="mt-0.5 text-sm text-slate-600">
                      {entry.detail}
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right text-xs sm:block">
                    <div
                      className={
                        entry.byYou
                          ? "font-semibold text-brand"
                          : "font-medium text-slate-700"
                      }
                    >
                      {entry.by.split(" (")[0]}
                    </div>
                    {entry.by.includes("(") && (
                      <div className="text-slate-400">
                        ({entry.by.split("(")[1]}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
          <span>
            Showing {fullTimeline.length} of {fullTimeline.length} entries
          </span>
          <Link
            href="/family"
            className="font-medium text-brand hover:underline"
          >
            ← Back to overview
          </Link>
        </div>
      </section>
    </>
  );
}
