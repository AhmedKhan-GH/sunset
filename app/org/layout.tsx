import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (!profile || !["org_admin", "practitioner"].includes(profile.role)) redirect("/");

  const [org] = profile.orgId
    ? await db.select().from(organizations).where(eq(organizations.id, profile.orgId))
    : [];

  const isOrgAdmin = profile.role === "org_admin";

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Sunset</span>
          {org && <span className="text-sm text-zinc-500">{org.name}</span>}
          <nav className="flex gap-4 text-sm">
            {isOrgAdmin && (
              <Link href="/org" className="hover:underline">
                Practitioners
              </Link>
            )}
            <Link href="/org/patients" className="hover:underline">
              Patients
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500 capitalize">{profile.role.replace("_", " ")}</span>
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
