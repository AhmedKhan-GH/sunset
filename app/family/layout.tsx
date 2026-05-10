import Link from "next/link";
import { SunsetLogo } from "@/components/sunset-logo";
import { FamilyTabs } from "./family-tabs";
import { family, patient } from "./data";

export default function FamilyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50">
      <header className="bg-brand text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <SunsetLogo gradientId="familyHeader" className="h-9 w-auto" />
            <span className="text-lg font-bold tracking-wider">SUNSET</span>
          </Link>

          <div className="flex flex-col items-center text-center">
            <span className="text-xs uppercase tracking-wide text-white/70">
              Caring for
            </span>
            <button
              type="button"
              className="flex items-center gap-1 text-lg font-semibold leading-tight"
            >
              {patient.first} {patient.last}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-xs uppercase tracking-wide text-white/70">
                Hello
              </div>
              <div className="text-sm font-medium leading-tight">
                {family.firstName}
              </div>
            </div>
            <div
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold"
            >
              {family.initials}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-6">
          <FamilyTabs />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-xs text-slate-500">
          <span>
            You have read and write access as {family.relationship.toLowerCase()}{" "}
            of {patient.first}.
          </span>
          <Link href="/" className="font-medium text-brand hover:underline">
            Sign out
          </Link>
        </div>
      </footer>
    </div>
  );
}
