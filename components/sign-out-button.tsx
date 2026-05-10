"use client";

import { useState } from "react";

export function SignOutButton({ action }: { action: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sign out
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Sign out?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You will need to sign in again to access the platform.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <form
                action={async () => {
                  setLoading(true);
                  await action();
                }}
                className="flex-1"
              >
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? "Signing out..." : "Sign out"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
