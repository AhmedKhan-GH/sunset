"use client";

import { createClient } from "@/lib/supabase/client";
import { getLoginRedirect } from "@/app/login-actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { SunsetLogo } from "@/components/sunset-logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const redirect = await getLoginRedirect();
    if (redirect === "/") {
      setError("No account found for this user.");
      setLoading(false);
      return;
    }

    router.push(redirect);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 p-8"
      >
        <div className="flex flex-col items-center gap-2 pb-2">
          <SunsetLogo className="h-20 w-auto" gradientId="loginLogo" />
          <h1 className="text-2xl font-bold tracking-tight">SUNSET</h1>
          <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
            Comfort. Dignity. Care.
          </span>
        </div>

        {error && (
          <p className="rounded-lg bg-status-urgent/10 px-4 py-3 text-sm text-status-urgent" role="alert">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <Link
          href="/register"
          className="rounded-xl border-2 border-brand bg-surface px-5 py-3 text-center text-base font-semibold text-brand transition-colors hover:bg-brand/10"
        >
          Register
        </Link>
      </form>
    </div>
  );
}
