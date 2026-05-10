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

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Sunset</span>
          <span className="text-sm text-zinc-500">{patient.name}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">Patient</span>
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
