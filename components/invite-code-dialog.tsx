"use client";

import { useState } from "react";

export function InviteCodeDialog({
  code,
  email,
  onClose,
}: {
  code: string;
  email: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Invite Code Generated</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Share this code securely with <span className="font-medium text-foreground">{email}</span> so
          they can register their account.
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
          <span className="flex-1 text-center font-mono text-2xl font-bold tracking-[0.3em] text-brand">
            {code}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-100"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          This code is single-use and tied to the email above. Communicate it
          through a secure channel (in person, phone, secure messaging).
        </p>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
