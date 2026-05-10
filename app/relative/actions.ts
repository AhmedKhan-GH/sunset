"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { organizations, patients, relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

async function requireRelative() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [relative] = await db
    .select()
    .from(relatives)
    .where(eq(relatives.userId, user.id));

  if (!relative) redirect("/");
  return relative;
}

export async function getMyRelativeRow() {
  return requireRelative();
}

export async function getRelatedPatient() {
  const relative = await requireRelative();
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, relative.patientId));
  return patient;
}

export async function getCareTeam() {
  const patient = await getRelatedPatient();

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, patient.orgId));

  let practitionerEmail: string | null = null;
  if (patient.practitionerId) {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(patient.practitionerId);
    practitionerEmail = data.user?.email ?? null;
  }

  return { organization, practitionerEmail };
}
