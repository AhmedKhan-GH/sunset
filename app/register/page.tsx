"use client";

import { register } from "./actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
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
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm p-8 text-center">
          <h1 className="text-2xl font-semibold">Account ready</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 p-8"
      >
        <h1 className="text-2xl font-semibold">Register</h1>
        <p className="text-sm text-zinc-500">
          Set up your login credentials. Your email must already be on file with
          your care team.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded border px-3 py-2"
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
            className="rounded border px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          Already have credentials?{" "}
          <Link href="/" className="underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
