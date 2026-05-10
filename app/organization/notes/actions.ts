"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { embedText, vectorLiteral } from "@/lib/llm/embed";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function requireOrganizationMember() {
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

export async function getOrganizationNotes(patientId?: string) {
  const { profile } = await requireOrganizationMember();

  const notes = patientId
    ? await sql`
        select n.id, n.patient_id, n.author_id, n.content, n.created_at,
               p.name as patient_name
        from public.patient_notes n
        join public.patients p on p.id = n.patient_id
        where n.organization_id = ${profile.organizationId}
          and n.patient_id = ${patientId}
        order by n.created_at desc
        limit 50
      `
    : await sql`
        select n.id, n.patient_id, n.author_id, n.content, n.created_at,
               p.name as patient_name
        from public.patient_notes n
        join public.patients p on p.id = n.patient_id
        where n.organization_id = ${profile.organizationId}
        order by n.created_at desc
        limit 50
      `;

  return notes.map((n) => ({
    id: n.id,
    patientId: n.patient_id,
    patientName: n.patient_name,
    content: n.content,
    createdAt: n.created_at,
    authorId: n.author_id,
  }));
}

export async function searchOrganizationNotes(query: string, patientId?: string) {
  const { profile } = await requireOrganizationMember();

  if (!query.trim()) return [];

  const embedding = await embedText(query.trim());
  const vec = vectorLiteral(embedding);

  const results = patientId
    ? await sql`
        select
          n.id, n.patient_id, n.content, n.created_at,
          p.name as patient_name,
          1 - (n.embedding <=> ${vec}::vector) as similarity
        from public.patient_notes n
        join public.patients p on p.id = n.patient_id
        where n.organization_id = ${profile.organizationId}
          and n.patient_id = ${patientId}
          and n.embedding is not null
        order by n.embedding <=> ${vec}::vector
        limit 20
      `
    : await sql`
        select
          n.id, n.patient_id, n.content, n.created_at,
          p.name as patient_name,
          1 - (n.embedding <=> ${vec}::vector) as similarity
        from public.patient_notes n
        join public.patients p on p.id = n.patient_id
        where n.organization_id = ${profile.organizationId}
          and n.embedding is not null
        order by n.embedding <=> ${vec}::vector
        limit 20
      `;

  return results.map((r) => ({
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patient_name,
    content: r.content,
    createdAt: r.created_at,
    similarity: Number(r.similarity),
  }));
}

export async function getOrganizationPatients() {
  const { profile } = await requireOrganizationMember();

  const result = await db
    .select({ id: patients.id, name: patients.name })
    .from(patients)
    .where(eq(patients.organizationId, profile.organizationId));

  return result;
}
