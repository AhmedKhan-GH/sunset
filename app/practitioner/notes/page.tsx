import { clinicalNotes, type ClinicalNote } from "../data";

const typeStyles: Record<ClinicalNote["type"], string> = {
  "Visit Note": "bg-violet-100 text-violet-700 ring-violet-600/20",
  "Phone Note": "bg-sky-100 text-sky-700 ring-sky-600/20",
  "Med Adjustment": "bg-amber-100 text-amber-700 ring-amber-600/20",
  "Care Plan Update": "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
};

export default function NotesPage() {
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Clinical Notes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Notes you've written across your caseload. Searchable, exportable
            for documentation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search notes…"
            className="w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <select className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option>All note types</option>
            <option>Visit notes</option>
            <option>Med adjustments</option>
            <option>Care plan updates</option>
          </select>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <ul className="divide-y divide-slate-100">
          {clinicalNotes.map((n) => (
            <li key={n.id} className="px-6 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${typeStyles[n.type]}`}
                  >
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
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
