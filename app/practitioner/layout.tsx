import Link from "next/link";
import { SunsetLogo } from "@/components/sunset-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { PractitionerTabs } from "./practitioner-tabs";
import { practitioner } from "./data";

export default function PractitionerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <SunsetLogo gradientId="practitionerHeader" className="h-9 w-auto" />
            <span className="text-lg font-bold tracking-wider text-slate-900">
              SUNSET
            </span>
            <span className="hidden rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand sm:inline">
              Clinician
            </span>
          </Link>

          <div className="hidden flex-1 max-w-md md:block">
            <label className="relative flex items-center">
              <span className="sr-only">Search patients</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 h-4 w-4 text-slate-400"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                placeholder="Search patients by name or ID…"
                className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {practitioner.role}
              </div>
              <div className="text-sm font-medium leading-tight text-slate-900">
                {practitioner.firstName}
              </div>
            </div>
            <div
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white"
            >
              {practitioner.initials}
            </div>
            <SignOutButton />
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-6">
          <PractitionerTabs />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-slate-500">
          Signed in as {practitioner.name} · {practitioner.org}
        </div>
      </footer>
    </div>
  );
}
