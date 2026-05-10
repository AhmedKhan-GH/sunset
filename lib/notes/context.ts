import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, patients, relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type NoteContext = {
  userId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  organizationId: string;
  patientId?: string;
  role: string;
};

/**
 * Resolves the current user's note context (org, role, optional patient).
 *
 * Wrapped in react.cache() so concurrent callers within a single render
 * share the same supabase.auth.getUser() result. Without this, pages that
 * fan out (e.g. Promise.all([getNotes(), resolveNoteContext()])) race on
 * cookie-refresh writes, corrupt the session, and sign the user out on the
 * next request.
 *
 * Lives in a regular module (no "use server") because Next.js processes
 * "use server" exports as Server Actions, which strips the cache wrapper.
 */
export const resolveNoteContext = cache(async (): Promise<NoteContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id));

  if (!profile) redirect("/");

  if (profile.role === "organization_admin" || profile.role === "practitioner") {
    if (!profile.organizationId) redirect("/");
    return {
      userId: user.id,
      supabase,
      organizationId: profile.organizationId,
      role: profile.role,
    };
  }

  if (profile.role === "patient") {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, user.id));
    if (!patient) redirect("/");
    return {
      userId: user.id,
      supabase,
      organizationId: patient.organizationId,
      patientId: patient.id,
      role: profile.role,
    };
  }

  if (profile.role === "relative") {
    const [relative] = await db
      .select()
      .from(relatives)
      .where(eq(relatives.userId, user.id));
    if (!relative) redirect("/");
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, relative.patientId));
    if (!patient) redirect("/");
    return {
      userId: user.id,
      supabase,
      organizationId: patient.organizationId,
      patientId: patient.id,
      role: profile.role,
    };
  }

  redirect("/");
});
