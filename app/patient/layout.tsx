import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import { SunsetLogo } from "@/components/sunset-logo";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, user.id));

  if (!patient) redirect("/");

  const initials = patient.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-slate-200 bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <SunsetLogo className="h-8 w-auto" gradientId="patientHeader" />
              <span className="text-sm font-bold tracking-tight">SUNSET</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {patient.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Patient</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
              {initials}
            </div>
            <SignOutButton action={signOut} />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-6xl px-6">
          <nav className="flex gap-1">
            <NavLink href="/patient" exact>
              Home
            </NavLink>
            <NavLink href="/patient/notes">Notes</NavLink>
            <NavLink href="/patient/chat">Chat</NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
