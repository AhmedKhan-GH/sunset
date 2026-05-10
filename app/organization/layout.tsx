import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import { SunsetLogo } from "@/components/sunset-logo";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id));
  if (
    !profile ||
    !["organization_admin", "practitioner"].includes(profile.role)
  )
    redirect("/");

  const [organization] = profile.organizationId
    ? await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, profile.organizationId))
    : [];

  const isOrganizationAdmin = profile.role === "organization_admin";
  const initials = (profile.name ?? user.email ?? "U")
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
              <SunsetLogo className="h-8 w-auto" gradientId="orgHeader" />
              <span className="text-sm font-bold tracking-tight">SUNSET</span>
            </div>
            {organization && (
              <span className="text-sm text-muted-foreground">
                {organization.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs capitalize text-muted-foreground">
              {profile.role.replaceAll("_", " ")}
            </span>
            <span className="text-sm font-medium">{profile.name}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
              {initials}
            </div>
            <SignOutButton action={signOut} />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-6xl px-6">
          <nav className="flex gap-1">
            {isOrganizationAdmin && (
              <NavLink href="/organization" exact>
                Practitioners
              </NavLink>
            )}
            <NavLink href="/organization/patients">Patients</NavLink>
            <NavLink href="/organization/notes">Notes</NavLink>
            <NavLink href="/organization/chat">Chat</NavLink>
            {isOrganizationAdmin && (
              <NavLink href="/organization/audit">Audit</NavLink>
            )}
            {isOrganizationAdmin && (
              <NavLink href="/organization/settings">Settings</NavLink>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
