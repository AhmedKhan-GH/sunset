import Link from "next/link";
import { NavLink } from "@/components/nav-link";
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

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Sunset</span>
          {organization && (
            <span className="text-sm text-zinc-500">{organization.name}</span>
          )}
          <nav className="flex gap-4 text-sm">
            {isOrganizationAdmin && (
              <NavLink href="/organization" exact>
                Practitioners
              </NavLink>
            )}
            <NavLink href="/organization/patients">
              Patients
            </NavLink>
            <NavLink href="/organization/notes">
              Notes
            </NavLink>
            <NavLink href="/organization/chat">
              Chat
            </NavLink>
            {isOrganizationAdmin && (
              <NavLink href="/organization/audit">
                Audit
              </NavLink>
            )}
            {isOrganizationAdmin && (
              <NavLink href="/organization/settings">
                Settings
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">{user.email}</span>
          <span className="text-zinc-400 capitalize">
            {profile.role.replaceAll("_", " ")}
          </span>
          <form action={signOut}>
            <button type="submit" className="hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
