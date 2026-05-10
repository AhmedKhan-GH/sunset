"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db, sql as rawSql } from "@/lib/db";
import { profiles, practitioners, patients, relatives, organizations, inviteCodes } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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

export async function createPractitioner(formData: FormData): Promise<{ inviteCode: string } | void> {
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
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  if (error) throw error;

  await db.insert(profiles).values({
    userId: data.user.id,
    name: name.trim(),
    role: "practitioner",
    organizationId: profile.organizationId,
  });

  await rawSql.begin(async (tx) => {
    await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: profile.userId })}, true)`;
    await tx`
      INSERT INTO practitioners (user_id, organization_id, specialty, license_number, npi)
      VALUES (
        ${data.user.id},
        ${profile.organizationId},
        ${typeof specialty === "string" && specialty.trim() ? specialty.trim() : null},
        ${typeof licenseNumber === "string" && licenseNumber.trim() ? licenseNumber.trim() : null},
        ${typeof npi === "string" && npi.trim() ? npi.trim() : null}
      )
    `;
  });

  const code = generateInviteCode();
  await db.insert(inviteCodes).values({
    email: email.trim().toLowerCase(),
    code,
    createdBy: profile.userId,
  });

  revalidatePath("/organization");
  return { inviteCode: code };
}

export async function getPatients() {
  const profile = await requireOrganizationUser();
  return db
    .select()
    .from(patients)
    .where(eq(patients.organizationId, profile.organizationId));
}

export async function createPatient(formData: FormData): Promise<{ inviteCode: string } | void> {
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

  const trimmedEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;

  const [practitioner] = await db
    .select()
    .from(practitioners)
    .where(eq(practitioners.userId, profile.userId));

  await rawSql.begin(async (tx) => {
    await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: profile.userId })}, true)`;
    await tx`
      INSERT INTO patients (organization_id, practitioner_id, name, email, date_of_birth, gender)
      VALUES (
        ${profile.organizationId},
        ${practitioner?.id ?? null},
        ${name.trim()},
        ${trimmedEmail},
        ${dateOfBirth.trim()},
        ${gender.trim()}
      )
    `;
  });

  let inviteCode: string | undefined;
  if (trimmedEmail) {
    const code = generateInviteCode();
    await db.insert(inviteCodes).values({
      email: trimmedEmail,
      code,
      createdBy: profile.userId,
    });
    inviteCode = code;
  }

  revalidatePath("/organization/patients");
  if (inviteCode) return { inviteCode };
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

export async function createRelative(patientId: string, formData: FormData): Promise<{ inviteCode: string } | void> {
  const profile = await requireOrganizationUser();

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

  const trimmedEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;

  await rawSql.begin(async (tx) => {
    await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: profile.userId })}, true)`;
    await tx`
      INSERT INTO relatives (patient_id, name, email, relationship)
      VALUES (
        ${patientId},
        ${name.trim()},
        ${trimmedEmail},
        ${relationship.trim()}
      )
    `;
  });

  let inviteCode: string | undefined;
  if (trimmedEmail) {
    const code = generateInviteCode();
    await db.insert(inviteCodes).values({
      email: trimmedEmail,
      code,
      createdBy: profile.userId,
    });
    inviteCode = code;
  }

  revalidatePath(`/organization/patients/${patientId}`);
  if (inviteCode) return { inviteCode };
}

export async function getAuditLogs() {
  const profile = await requireOrganizationAdmin();

  const results = await rawSql`
    select
      l.id,
      l.timestamp,
      l.actor_id,
      l.action,
      l.table_name,
      l.record_id,
      l.metadata,
      p.name as actor_name
    from audit.log l
    left join public.profiles p on p.user_id = l.actor_id
    where l.organization_id = ${profile.organizationId}
    order by l.timestamp desc
    limit 100
  `;

  return results as unknown as Array<{
    id: number;
    timestamp: string;
    actor_id: string;
    action: string;
    table_name: string;
    record_id: string | null;
    metadata: unknown;
    actor_name: string | null;
  }>;
}

export async function updateSystemPrompt(formData: FormData) {
  const profile = await requireOrganizationAdmin();

  const systemPrompt = formData.get("systemPrompt");
  const value = typeof systemPrompt === "string" ? systemPrompt.trim() || null : null;

  await db
    .update(organizations)
    .set({
      systemPrompt: value,
      updatedAt: sql`extract(epoch from now())::integer`,
    })
    .where(eq(organizations.id, profile.organizationId));

  revalidatePath("/organization/settings");
}
