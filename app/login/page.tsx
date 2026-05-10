"use client";

import { createClient } from "@/lib/supabase/client";
import { SunsetLogo } from "@/components/sunset-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/home");
  }

  return (
    <div className="flex flex-1 items-start justify-center bg-background py-10">
      <div className="w-full max-w-md px-6">
        <header className="flex flex-col items-center pb-8">
          <SunsetLogo className="h-28 w-auto" />
          <h1 className="text-4xl font-bold tracking-wider text-foreground">
            SUNSET
          </h1>
          <div className="mt-3 rounded bg-brand px-4 py-1">
            <span className="text-[11px] font-semibold tracking-[0.25em] text-white">
              COMFORT. DIGNITY. CARE.
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-status-urgent/10 px-4 py-3 text-sm text-status-urgent" role="alert">
              {error}
            </p>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Username"
            required
            className="w-full rounded-lg border border-border bg-surface px-4 py-4 text-base text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-lg border border-border bg-surface px-4 py-4 text-base text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-status-stable px-5 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between px-1 text-base">
          <a href="#" className="font-medium text-brand hover:underline">
            Forgot username?
          </a>
          <a href="#" className="font-medium text-brand hover:underline">
            Forgot password?
          </a>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <button
            type="button"
            className="w-full rounded-xl bg-brand px-5 py-4 text-base font-semibold text-white transition hover:brightness-110"
          >
            Activate my account
          </button>
          <Link
            href="/family"
            className="w-full rounded-xl border-2 border-brand bg-surface px-5 py-4 text-center text-base font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            I&apos;m a family caregiver →
          </Link>
          <Link
            href="/practitioner"
            className="w-full rounded-xl border-2 border-brand bg-surface px-5 py-4 text-center text-base font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            I'm a care provider →
          </Link>
        </div>

        <div className="mt-10 rounded-2xl bg-brand/5 p-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Need a hand?
            </h2>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              Our care team is here for you, day or night.
            </p>
          </div>
          <a
            href="tel:+18005550142"
            aria-label="Call our care team at 1 (800) 555-0142"
            className="mt-5 flex items-center justify-center gap-3 rounded-xl border-2 border-brand bg-surface px-5 py-5 text-2xl font-semibold tracking-wide text-brand transition hover:bg-brand/10"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-7 w-7"
            >
              <path d="M22 16.92V21a1 1 0 0 1-1.1 1 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 3.1 4.1 1 1 0 0 1 4.1 3h4.1a1 1 0 0 1 1 .8 12 12 0 0 0 .6 2.6 1 1 0 0 1-.2 1L8 8.9a16 16 0 0 0 6 6l1.5-1.5a1 1 0 0 1 1-.2 12 12 0 0 0 2.6.6 1 1 0 0 1 .8 1z" />
            </svg>
            1 (800) 555-0142
          </a>
        </div>
      </div>
    </div>
  );
}
