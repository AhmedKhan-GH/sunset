import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import { SunsetLogo } from "@/components/sunset-logo";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function RelativeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [relative] = await db
    .select()
    .from(relatives)
    .where(eq(relatives.userId, user.id));

  if (!relative) redirect("/");

  const initials = relative.name
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
              <SunsetLogo className="h-8 w-auto -translate-y-1" gradientId="relativeHeader" />
              <span className="text-sm font-bold tracking-tight">SUNSET</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {relative.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs capitalize text-muted-foreground">
              {relative.relationship}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
              {initials}
            </div>
            <SignOutButton action={signOut} />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-6xl px-6">
          <nav className="flex gap-1">
            <NavLink href="/relative" exact>
              Home
            </NavLink>
            <NavLink href="/relative/notes">Notes</NavLink>
            <NavLink href="/relative/chat">Chat</NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
