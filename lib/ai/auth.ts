import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, patients, relatives } from "@/lib/db/schema";

export type CallerContext = {
  userId: string;
  role: string;
  organizationId: string;
  patientId?: string;
};

type AuthSuccess = { ok: true; caller: CallerContext };
type AuthFailure = { ok: false; error: string };
export type AuthResult = AuthSuccess | AuthFailure;

export async function getCallerContext(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id));

  if (!profile) {
    return { ok: false, error: "No profile found for the current user." };
  }

  if (!profile.organizationId) {
    return { ok: false, error: "User is not associated with an organization." };
  }

  const base = {
    userId: user.id,
    role: profile.role,
    organizationId: profile.organizationId,
  };

  if (profile.role === "patient") {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, user.id));
    if (!patient) {
      return { ok: false, error: "Patient record not found." };
    }
    return { ok: true, caller: { ...base, patientId: patient.id } };
  }

  if (profile.role === "relative") {
    const [relative] = await db
      .select()
      .from(relatives)
      .where(eq(relatives.userId, user.id));
    if (!relative) {
      return { ok: false, error: "Relative record not found." };
    }
    return { ok: true, caller: { ...base, patientId: relative.patientId } };
  }

  return { ok: true, caller: base };
}
