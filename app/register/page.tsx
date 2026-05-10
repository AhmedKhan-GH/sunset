"use client";

import { register } from "./actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { SunsetLogo } from "@/components/sunset-logo";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("inviteCode", inviteCode);
    formData.set("password", password);

    const result = await register(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/"), 1500);
  }

  if (success) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="w-full max-w-sm p-8 text-center">
          <SunsetLogo className="mx-auto h-16 w-auto" gradientId="successLogo" />
          <h1 className="mt-4 text-2xl font-semibold">Account ready</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  const inputClasses =
    "w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft";

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 p-8"
      >
        <div className="flex flex-col items-center gap-2 pb-2">
          <SunsetLogo className="h-16 w-auto" gradientId="registerLogo" />
          <h1 className="text-2xl font-bold tracking-tight">Register</h1>
          <p className="text-center text-sm text-muted-foreground">
            Set up your login credentials using the invite code provided by
            your administrator.
          </p>
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
            className={inputClasses}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Invite code</span>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
            placeholder="e.g. A3B7K9X2"
            className={inputClasses + " font-mono tracking-widest"}
          />
          <span className="text-xs text-muted-foreground">
            Provided by your administrator or care team.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={inputClasses}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className={inputClasses}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Already have credentials?{" "}
          <Link href="/" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
