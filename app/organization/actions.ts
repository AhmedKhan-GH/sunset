"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { profiles, practitioners, patients, relatives, organizations } from "@/lib/db/schema";
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

  const practitionerList = await db
    .select({
      userId: practitioners.userId,
      organizationId: practitioners.organizationId,
      specialty: practitioners.specialty,
      licenseNumber: practitioners.licenseNumber,
      npi: practitioners.npi,
      name: profiles.name,
    })
    .from(practitioners)
    .innerJoin(profiles, eq(profiles.userId, practitioners.userId))
    .where(eq(practitioners.organizationId, profile.organizationId));

  const {
    data: { users },
  } = await admin.auth.admin.listUsers();
  const emailById = Object.fromEntries(
    users.map((u) => [u.id, u.email ?? ""]),
  );

  return practitionerList.map((p) => ({
    ...p,
    email: emailById[p.userId] ?? "",
  }));
}

export async function createPractitioner(formData: FormData) {
  const profile = await requireOrganizationAdmin();
  const admin = createAdminClient();

  const email = formData.get("email");
  const name = formData.get("name");
  const specialty = formData.get("specialty");
  const licenseNumber = formData.get("licenseNumber");
  const npi = formData.get("npi");

  if (typeof email !== "string" || !email.trim()) return;
  if (typeof name !== "string" || !name.trim()) return;

  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: "changeme123",
    email_confirm: true,
  });
  if (error) throw error;

  await db.insert(profiles).values({
    userId: data.user.id,
    name: name.trim(),
    role: "practitioner",
    organizationId: profile.organizationId,
  });

  await db.insert(practitioners).values({
    userId: data.user.id,
    organizationId: profile.organizationId,
    specialty: typeof specialty === "string" && specialty.trim() ? specialty.trim() : null,
    licenseNumber: typeof licenseNumber === "string" && licenseNumber.trim() ? licenseNumber.trim() : null,
    npi: typeof npi === "string" && npi.trim() ? npi.trim() : null,
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
  const email = formData.get("email");
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

  const [practitioner] = await db
    .select()
    .from(practitioners)
    .where(eq(practitioners.userId, profile.userId));

  await db.insert(patients).values({
    organizationId: profile.organizationId,
    practitionerId: practitioner?.id,
    name: name.trim(),
    email: typeof email === "string" && email.trim() ? email.trim() : null,
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
  const email = formData.get("email");
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
    email: typeof email === "string" && email.trim() ? email.trim() : null,
    relationship: relationship.trim(),
  });

  revalidatePath(`/organization/patients/${patientId}`);
}
