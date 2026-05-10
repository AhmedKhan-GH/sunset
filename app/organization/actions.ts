"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { profiles, patients, relatives, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireOrganizationUser() {
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
  if (!profile.organizationId) redirect("/");

  return profile as typeof profile & { organizationId: string };
}

async function requireOrganizationAdmin() {
  const profile = await requireOrganizationUser();
  if (profile.role !== "organization_admin")
    redirect("/organization/patients");
  return profile;
}

export async function getMyOrganization() {
  const profile = await requireOrganizationUser();
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, profile.organizationId));
  return organization;
}

export async function getPractitioners() {
  const profile = await requireOrganizationAdmin();
  const admin = createAdminClient();

  const practitioners = await db
    .select()
    .from(profiles)
    .where(eq(profiles.organizationId, profile.organizationId));

  const {
    data: { users },
  } = await admin.auth.admin.listUsers();
  const emailById = Object.fromEntries(
    users.map((u) => [u.id, u.email ?? ""]),
  );

  return practitioners
    .filter((p) => p.role === "practitioner")
    .map((p) => ({ ...p, email: emailById[p.userId] ?? "" }));
}

export async function createPractitioner(formData: FormData) {
  const profile = await requireOrganizationAdmin();
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
    organizationId: profile.organizationId,
  });

  revalidatePath("/organization");
}

export async function getPatients() {
  const profile = await requireOrganizationUser();
  return db
    .select()
    .from(patients)
    .where(eq(patients.organizationId, profile.organizationId));
}

export async function createPatient(formData: FormData) {
  const profile = await requireOrganizationUser();

  const name = formData.get("name");
  const dateOfBirth = formData.get("dateOfBirth");
  const gender = formData.get("gender");

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof dateOfBirth !== "string" ||
    !dateOfBirth.trim() ||
    typeof gender !== "string" ||
    !gender.trim()
  )
    return;

  await db.insert(patients).values({
    organizationId: profile.organizationId,
    practitionerId: profile.userId,
    name: name.trim(),
    dateOfBirth: dateOfBirth.trim(),
    gender: gender.trim(),
  });

  revalidatePath("/organization/patients");
}

export async function getPatientWithRelatives(patientId: string) {
  const profile = await requireOrganizationUser();

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));

  if (!patient || patient.organizationId !== profile.organizationId)
    redirect("/organization/patients");

  const rels = await db
    .select()
    .from(relatives)
    .where(eq(relatives.patientId, patientId));

  return { patient, relatives: rels };
}

export async function createRelative(patientId: string, formData: FormData) {
  await requireOrganizationUser();

  const name = formData.get("name");
  const relationship = formData.get("relationship");

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof relationship !== "string" ||
    !relationship.trim()
  )
    return;

  await db.insert(relatives).values({
    patientId,
    name: name.trim(),
    relationship: relationship.trim(),
  });

  revalidatePath(`/organization/patients/${patientId}`);
}
