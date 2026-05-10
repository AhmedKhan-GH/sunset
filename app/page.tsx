"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    router.push("/admin");
  }

  return (
    <div className="flex flex-1 items-start justify-center bg-background py-10">
      <div className="w-full max-w-md px-6">
        <header className="flex flex-col items-center gap-2 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-status-urgent">
              <svg
                viewBox="0 0 24 24"
                fill="white"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
              </svg>
            </div>
            <span className="text-4xl font-semibold tracking-tight text-foreground">
              Sunset
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            powered by hospice care
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <p className="text-sm text-status-urgent" role="alert">
              {error}
            </p>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Sunset Username"
            required
            className="w-full rounded border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded border border-border bg-surface px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded bg-status-stable px-4 py-3 text-base font-medium text-white transition-colors hover:brightness-95 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between px-1 text-sm">
          <a href="#" className="font-medium text-sky-600 hover:underline">
            Forgot username?
          </a>
          <a href="#" className="font-medium text-sky-600 hover:underline">
            Forgot password?
          </a>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            className="w-full rounded bg-sky-600 px-4 py-3 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-sky-700"
          >
            ACTIVATE ACCOUNT
          </button>
          <button
            type="button"
            className="w-full rounded bg-sky-600 px-4 py-3 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-sky-700"
          >
            REQUEST ACCESS
          </button>
          <button
            type="button"
            className="w-full rounded bg-sky-600 px-4 py-3 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-sky-700"
          >
            HEALTH PLAN SUNSET ACCESS
          </button>
          <button
            type="button"
            className="w-full rounded bg-sky-600 px-4 py-3 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-sky-700"
          >
            PAY AS GUEST
          </button>
        </div>

        <div className="mt-8 text-center">
          <h2 className="text-xl font-semibold text-status-urgent">
            Customer Support
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If you are having problems logging into the web site, or any other
            technical issues, please contact us.
          </p>
        </div>
      </div>
    </div>
  );
}
