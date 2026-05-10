import Link from "next/link";
import { SunsetLogo } from "@/components/sunset-logo";
import { SignOutButton } from "./sign-out-button";

const symptoms = [
  {
    label: "Pain",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
      </svg>
    ),
  },
  {
    label: "Shortness of Breath",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4v9" />
        <path d="M9 4c-3 0-4 2-4 5 0 3-2 6-2 8 0 1 1 2 3 2 3 0 5-2 5-5V8a4 4 0 0 0-2-4z" />
        <path d="M15 4c3 0 4 2 4 5 0 3 2 6 2 8 0 1-1 2-3 2-3 0-5-2-5-5V8a4 4 0 0 1 2-4z" />
      </svg>
    ),
  },
  {
    label: "Nausea / Vomiting",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 10h.01M15 10h.01" />
        <path d="M8 16c1-1 2 0 3-1s2 1 3 0 2 1 3 0" />
      </svg>
    ),
  },
  {
    label: "Anxiety / Agitation",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12h3l2-5 3 10 2-7 2 4h6" />
      </svg>
    ),
  },
  {
    label: "Constipation",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9c0-3 3-5 6-5s6 2 6 5v6c0 3-3 5-6 5s-6-2-6-5z" />
        <path d="M9 11c1 1 1 3 0 4M15 11c-1 1-1 3 0 4" />
      </svg>
    ),
  },
  {
    label: "Congestion",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3c-3 5-7 8-7 12a7 7 0 0 0 14 0c0-4-4-7-7-12z" />
      </svg>
    ),
  },
  {
    label: "Fever",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 4a2 2 0 0 0-4 0v10a4 4 0 1 0 4 0z" />
        <line x1="12" y1="6" x2="12" y2="13" />
      </svg>
    ),
  },
  {
    label: "Other Symptom",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <SunsetLogo
              gradientId="sunsetLogoHeader"
              className="h-10 w-auto"
            />
            <span className="text-lg font-bold tracking-wider text-foreground">
              SUNSET
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white"
            >
              E
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10">
        <section className="flex items-center justify-between pt-6 pb-5">
          <h1 className="text-3xl font-semibold text-brand">
            Welcome, Eleanor
          </h1>
          <button
            type="button"
            aria-label="Settings"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </section>

        <h2 className="pb-3 text-lg font-semibold text-foreground">
          Need help right now?
        </h2>
        <section className="flex flex-col gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-3 rounded-xl bg-status-stable px-5 py-5 text-lg font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M22 16.92V21a1 1 0 0 1-1.1 1 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 3.1 4.1 1 1 0 0 1 4.1 3h4.1a1 1 0 0 1 1 .8 12 12 0 0 0 .6 2.6 1 1 0 0 1-.2 1L8 8.9a16 16 0 0 0 6 6l1.5-1.5a1 1 0 0 1 1-.2 12 12 0 0 0 2.6.6 1 1 0 0 1 .8 1z" />
            </svg>
            Contact Doctor
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-3 rounded-xl bg-brand px-5 py-5 text-lg font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <rect x="4" y="6" width="16" height="12" rx="3" />
              <path d="M12 2v4M9 12h.01M15 12h.01M9 16c1 .8 2 1 3 1s2-.2 3-1" />
            </svg>
            Contact Sunny
          </button>
        </section>

        <h2 className="pt-8 pb-3 text-lg font-semibold text-foreground">
          How are you feeling?
        </h2>
        <section className="grid grid-cols-2 gap-3">
          {symptoms.map((symptom) => (
            <Link
              key={symptom.label}
              href={symptom.href}
              className="flex aspect-square flex-col items-center justify-center gap-3 rounded-xl bg-surface p-4 shadow-sm ring-1 ring-border transition-colors hover:bg-muted"
            >
              <span className="flex h-12 w-12 items-center justify-center text-brand">
                <span className="block h-11 w-11">{symptom.icon}</span>
              </span>
              <span className="text-center text-base font-medium leading-tight text-foreground">
                {symptom.label}
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-xl bg-surface p-4 shadow-sm ring-1 ring-border">
          <div className="flex items-center gap-2 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 3v4M16 3v4" />
              </svg>
            </span>
            <h2 className="font-semibold text-foreground">Upcoming Nurse Visit</h2>
          </div>
          <div className="flex gap-4">
            <div className="flex w-16 flex-col items-center rounded-lg bg-brand-soft/40 py-2 text-brand">
              <span className="text-sm font-medium uppercase">May</span>
              <span className="text-2xl font-bold leading-none">12</span>
              <span className="text-sm uppercase">Tue</span>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-1 text-base text-foreground">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Arrives</span>
                <span>10:00 AM</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Nurse</span>
                <span>Sarah Chen, RN</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Visit</span>
                <span>Home check-in</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl bg-surface p-4 shadow-sm ring-1 ring-border">
          <div className="flex items-center gap-2 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-status-attention/15 text-status-attention">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </span>
            <h2 className="font-semibold text-foreground">Note from your care team</h2>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
              DS
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-base font-medium text-foreground">
                Dr. Smith — May 8
              </span>
              <p className="rounded-lg bg-muted px-3 py-2 text-base text-foreground">
                Eleanor, please continue logging pain levels twice a day. If
                pain is above 6, take the prescribed dose and use the Voice
                Check-In to record how you feel.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
