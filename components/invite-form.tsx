"use client";

import { useState, useTransition } from "react";
import { InviteCodeDialog } from "./invite-code-dialog";

export function InviteForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<{ inviteCode: string } | void>;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [inviteResult, setInviteResult] = useState<{ code: string; email: string } | null>(null);

  function handleSubmit(formData: FormData) {
    const email = formData.get("email") as string;
    startTransition(async () => {
      const result = await action(formData);
      if (result?.inviteCode) {
        setInviteResult({ code: result.inviteCode, email });
      }
    });
  }

  return (
    <>
      <form action={handleSubmit} className={className}>
        {children}
        {pending && (
          <div className="mt-2 text-xs text-muted-foreground">Creating...</div>
        )}
      </form>
      {inviteResult && (
        <InviteCodeDialog
          code={inviteResult.code}
          email={inviteResult.email}
          onClose={() => setInviteResult(null)}
        />
      )}
    </>
  );
}
