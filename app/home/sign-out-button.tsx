"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirmSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        Sign Out
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="signout-title"
              className="text-xl font-semibold text-foreground"
            >
              Sign out of Sunset?
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              You can sign back in anytime with your username and password.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={confirmSignOut}
                disabled={loading}
                className="w-full rounded-xl bg-brand px-5 py-4 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Signing out..." : "Yes, sign out"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="w-full rounded-xl border border-border bg-surface px-5 py-4 text-base font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
