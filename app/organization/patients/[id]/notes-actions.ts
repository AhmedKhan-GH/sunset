"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, practitioners, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { embedText, vectorLiteral } from "@/lib/llm/embed";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function requireOrganizationPractitioner() {
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

  return { user, profile: profile as typeof profile & { organizationId: string } };
}

async function requireNoteAccess(patientId: string) {
  const { user, profile } = await requireOrganizationPractitioner();

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));

  if (!patient || patient.organizationId !== profile.organizationId)
    redirect("/organization/patients");

  return { user, profile, patient };
}

export async function getPatientNotes(patientId: string) {
  const { profile } = await requireNoteAccess(patientId);

  const notes = await sql`
    select id, author_id, content, created_at
    from public.patient_notes
    where patient_id = ${patientId}
      and organization_id = ${profile.organizationId}
    order by created_at desc
    limit 50
  `;

  const authorIds = [...new Set(notes.map((n) => n.author_id))];
  if (authorIds.length === 0) return [];

  const authors = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.userId, authorIds[0]));

  const practitionerRows = await db
    .select()
    .from(practitioners);

  const practitionerByUserId = Object.fromEntries(
    practitionerRows.map((p) => [p.userId, p]),
  );

  return notes.map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.created_at,
    authorId: n.author_id,
    authorName: practitionerByUserId[n.author_id]?.specialty ?? "Practitioner",
  }));
}

export async function createPatientNote(patientId: string, formData: FormData) {
  const { user, profile } = await requireNoteAccess(patientId);

  const content = formData.get("content");
  if (typeof content !== "string" || !content.trim()) return;

  const embedding = await embedText(content.trim());
  const vec = vectorLiteral(embedding);

  await sql`
    insert into public.patient_notes
      (organization_id, patient_id, author_id, content, embedding)
    values
      (${profile.organizationId}, ${patientId}, ${user.id}, ${content.trim()}, ${vec}::vector)
  `;

  revalidatePath(`/organization/patients/${patientId}`);
}

export async function searchPatientNotes(
  patientId: string,
  query: string,
) {
  const { profile } = await requireNoteAccess(patientId);

  if (!query.trim()) return [];

  const embedding = await embedText(query.trim());
  const vec = vectorLiteral(embedding);

  const results = await sql`
    select
      id, content, created_at,
      1 - (embedding <=> ${vec}::vector) as similarity
    from public.patient_notes
    where patient_id = ${patientId}
      and organization_id = ${profile.organizationId}
      and embedding is not null
    order by embedding <=> ${vec}::vector
    limit 10
  `;

  return results.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    similarity: Number(r.similarity),
  }));
}
