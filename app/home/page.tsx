"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SunsetLogo } from "@/components/sunset-logo";
import { Sidebar } from "./sidebar";
import { SignOutButton } from "@/components/sign-out-button";

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

type SettingToggleProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

function SettingToggle({ checked, label, onChange }: SettingToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 border-t border-border px-4 py-4 text-left transition-colors first:border-t-0 hover:bg-muted"
    >
      <span className="font-medium text-foreground">{label}</span>
      <span
        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
          checked ? "bg-brand" : "bg-slate-300"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [largeText, setLargeText] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [voiceCheckIns, setVoiceCheckIns] = useState(true);
  const [medicationReminders, setMedicationReminders] = useState(true);
  const [quietHours, setQuietHours] = useState(false);
  const [alertVolume, setAlertVolume] = useState(70);

  useEffect(() => {
    if (!sidebarOpen && !settingsOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setSidebarOpen(false);
      setSettingsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen, settingsOpen]);

  return (
    <div className="flex flex-1 bg-background">
      <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <SunsetLogo
            gradientId="sunsetLogoSidebar"
            className="h-10 w-auto"
          />
          <span className="text-lg font-bold tracking-wider text-foreground">
            SUNSET
          </span>
        </div>
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-surface">
            <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4 px-4 py-3 md:max-w-3xl">
              <button
                type="button"
                aria-label={sidebarOpen ? "Close menu" : "Open menu"}
                aria-expanded={sidebarOpen}
                aria-controls="main-sidebar"
                onClick={() => setSidebarOpen((open) => !open)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>

              <div className="flex items-center gap-2 md:hidden">
                <SunsetLogo
                  gradientId="sunsetLogoHeader"
                  className="h-10 w-auto"
                />
                <span className="text-lg font-bold tracking-wider text-foreground">
                  SUNSET
                </span>
              </div>

              <div className="hidden min-w-0 flex-1 md:block">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Current patient
                </p>
                <p className="truncate text-2xl font-semibold leading-tight text-foreground">
                  Eleanor Rivera
                </p>
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

      <aside
        id="main-sidebar"
        aria-hidden={!sidebarOpen}
        className={`fixed left-0 top-0 z-40 flex h-full w-72 transform flex-col overflow-y-auto border-r border-border bg-surface shadow-xl transition-transform md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-lg font-bold tracking-wider text-foreground">
            Menu
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6">
              <path d="M6 6 18 18M6 18 18 6" />
            </svg>
          </button>
        </div>
        <Sidebar />
      </aside>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 md:max-w-3xl">
        <section className="flex items-center justify-between pt-6 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground md:hidden">
              Eleanor Rivera
            </p>
            <h1 className="text-3xl font-semibold text-brand">
              Welcome, Eleanor
            </h1>
          </div>
          <button
            type="button"
            aria-label="Settings"
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </section>

        {settingsOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="fixed inset-0 z-50 flex items-end bg-black/35 px-3 pb-3 pt-12 sm:items-center sm:justify-center sm:p-6"
            onClick={() => setSettingsOpen(false)}
          >
            <div
              className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-black/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2
                    id="settings-title"
                    className="text-xl font-semibold text-foreground"
                  >
                    Settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Eleanor Rivera
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close settings"
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6">
                    <path d="M6 6 18 18M6 18 18 6" />
                  </svg>
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
                <section>
                  <h3 className="pb-3 text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Display
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-border bg-white">
                    <SettingToggle
                      checked={largeText}
                      label="Larger text"
                      onChange={setLargeText}
                    />
                    <SettingToggle
                      checked={highContrast}
                      label="High contrast"
                      onChange={setHighContrast}
                    />
                    <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-4">
                      <label
                        htmlFor="alert-volume"
                        className="font-medium text-foreground"
                      >
                        Alert volume
                      </label>
                      <div className="flex w-36 items-center gap-3">
                        <input
                          id="alert-volume"
                          type="range"
                          min="0"
                          max="100"
                          value={alertVolume}
                          onChange={(e) =>
                            setAlertVolume(Number(e.target.value))
                          }
                          className="w-full accent-brand"
                        />
                        <span className="w-8 text-right text-sm font-semibold text-muted-foreground">
                          {alertVolume}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="pb-3 text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Care
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-border bg-white">
                    <SettingToggle
                      checked={voiceCheckIns}
                      label="Voice check-ins"
                      onChange={setVoiceCheckIns}
                    />
                    <SettingToggle
                      checked={medicationReminders}
                      label="Medication reminders"
                      onChange={setMedicationReminders}
                    />
                    <SettingToggle
                      checked={quietHours}
                      label="Quiet hours"
                      onChange={setQuietHours}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="pb-3 text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Contacts
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-border bg-white">
                    <a
                      href="tel:+18005550142"
                      className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted"
                    >
                      <span className="font-medium text-foreground">
                        Care team
                      </span>
                      <span className="text-sm font-semibold text-brand">
                        Call
                      </span>
                    </a>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 border-t border-border px-4 py-4 text-left transition-colors hover:bg-muted"
                    >
                      <span className="font-medium text-foreground">
                        Emergency contact
                      </span>
                      <span className="text-sm font-semibold text-brand">
                        Edit
                      </span>
                    </button>
                  </div>
                </section>
              </div>

              <div className="shrink-0 border-t border-border px-5 pb-5 pt-4">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="w-full rounded-xl bg-brand px-5 py-4 text-base font-semibold text-white transition hover:brightness-110"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

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
            Contact Sunny AI
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
    </div>
  );
}
