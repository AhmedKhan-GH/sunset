"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { profiles, patients, relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireOrgUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (!profile || !["org_admin", "practitioner"].includes(profile.role)) redirect("/");
  if (!profile.orgId) redirect("/");

  return profile as typeof profile & { orgId: string };
}

async function requireOrgAdmin() {
  const profile = await requireOrgUser();
  if (profile.role !== "org_admin") redirect("/org/patients");
  return profile;
}

// ── Practitioners ───────────────────────────────────────────────────────────

export async function getPractitioners() {
  const profile = await requireOrgAdmin();
  const admin = createAdminClient();

  const practitioners = await db
    .select()
    .from(profiles)
    .where(eq(profiles.orgId, profile.orgId));

  const { data: { users } } = await admin.auth.admin.listUsers();
  const emailById = Object.fromEntries(users.map((u) => [u.id, u.email ?? ""]));

  return practitioners
    .filter((p) => p.role === "practitioner")
    .map((p) => ({ ...p, email: emailById[p.userId] ?? "" }));
}

export async function createPractitioner(formData: FormData) {
  const profile = await requireOrgAdmin();
  const admin = createAdminClient();

  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) return;

  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: "changeme123",
    email_confirm: true,
  });
  if (error) throw error;

  await db.insert(profiles).values({
    userId: data.user.id,
    role: "practitioner",
    orgId: profile.orgId,
  });

  revalidatePath("/org");
}

// ── Patients ─────────────────────────────────────────────────────────────────

export async function getPatients() {
  const profile = await requireOrgUser();
  return db.select().from(patients).where(eq(patients.orgId, profile.orgId));
}

export async function createPatient(formData: FormData) {
  const profile = await requireOrgUser();

  const name = formData.get("name");
  const dateOfBirth = formData.get("dateOfBirth");
  const gender = formData.get("gender");

  if (
    typeof name !== "string" || !name.trim() ||
    typeof dateOfBirth !== "string" || !dateOfBirth.trim() ||
    typeof gender !== "string" || !gender.trim()
  ) return;

  await db.insert(patients).values({
    orgId: profile.orgId,
    practitionerId: profile.userId,
    name: name.trim(),
    dateOfBirth: dateOfBirth.trim(),
    gender: gender.trim(),
  });

  revalidatePath("/org/patients");
}

// ── Relatives ────────────────────────────────────────────────────────────────

export async function getPatientWithRelatives(patientId: string) {
  const profile = await requireOrgUser();

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));

  if (!patient || patient.orgId !== profile.orgId) redirect("/org/patients");

  const rels = await db.select().from(relatives).where(eq(relatives.patientId, patientId));

  return { patient, relatives: rels };
}

export async function createRelative(patientId: string, formData: FormData) {
  await requireOrgUser();

  const name = formData.get("name");
  const relationship = formData.get("relationship");

  if (
    typeof name !== "string" || !name.trim() ||
    typeof relationship !== "string" || !relationship.trim()
  ) return;

  await db.insert(relatives).values({
    patientId,
    name: name.trim(),
    relationship: relationship.trim(),
  });

  revalidatePath(`/org/patients/${patientId}`);
}
