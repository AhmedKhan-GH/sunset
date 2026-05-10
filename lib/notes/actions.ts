"use server";

import { createClient } from "@/lib/supabase/server";
import { db, sql } from "@/lib/db";
import { profiles, patients, relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

type NoteContext = {
  userId: string;
  organizationId: string;
  patientId?: string;
  role: string;
};

export async function resolveNoteContext(): Promise<NoteContext> {
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
      organizationId: patient.organizationId,
      patientId: patient.id,
      role: profile.role,
    };
  }

  redirect("/");
}

export async function getNotes(patientId?: string) {
  const ctx = await resolveNoteContext();

  const effectivePatientId = patientId ?? ctx.patientId;
  const patientFilter = effectivePatientId
    ? sql`and n.patient_id = ${effectivePatientId}`
    : sql``;

  const results = await sql`
    select
      n.id, n.patient_id, n.author_id, n.content, n.created_at,
      p.name as patient_name,
      pr.name as author_name
    from public.patient_notes n
    join public.patients p on p.id = n.patient_id
    left join public.profiles pr on pr.user_id = n.author_id
    where n.organization_id = ${ctx.organizationId}
      ${patientFilter}
    order by n.created_at desc
    limit 50
  `;

  return results.map((r) => ({
    id: r.id as string,
    patientId: r.patient_id as string,
    patientName: r.patient_name as string,
    authorId: r.author_id as string,
    authorName: (r.author_name as string) ?? null,
    content: r.content as string,
    createdAt: r.created_at as string,
  }));
}

export async function createNote(patientId: string, formData: FormData) {
  const ctx = await resolveNoteContext();

  if (ctx.role === "patient" || ctx.role === "relative") {
    if (patientId !== ctx.patientId) {
      throw new Error("Not authorized to create notes for this patient.");
    }
  }

  const content = formData.get("content");
  if (typeof content !== "string" || !content.trim()) return;

  const embedding = await embedText(content.trim());
  const vec = vectorLiteral(embedding);

  await sql`
    insert into public.patient_notes (organization_id, patient_id, author_id, content, embedding)
    values (${ctx.organizationId}, ${patientId}, ${ctx.userId}, ${content.trim()}, ${vec}::vector)
  `;
}

export async function searchNotes(
  query: string,
  patientId?: string,
  filterOut?: string,
) {
  const ctx = await resolveNoteContext();
  const effectivePatientId = patientId ?? ctx.patientId;

  if (!query.trim()) return [];

  const embedding = await embedText(query.trim());
  const vec = vectorLiteral(embedding);

  const patientFilter = effectivePatientId
    ? sql`and n.patient_id = ${effectivePatientId}`
    : sql``;

  if (filterOut?.trim()) {
    const negEmbedding = await embedText(filterOut.trim());
    const negVec = vectorLiteral(negEmbedding);

    const results = await sql`
      select
        n.id, n.patient_id, n.author_id, n.content, n.created_at,
        p.name as patient_name,
        pr.name as author_name,
        (1 - (n.embedding <=> ${vec}::vector))::float as similarity,
        (1 - (n.embedding <=> ${negVec}::vector))::float as filtered_similarity
      from public.patient_notes n
      join public.patients p on p.id = n.patient_id
      left join public.profiles pr on pr.user_id = n.author_id
      where n.organization_id = ${ctx.organizationId}
        ${patientFilter}
        and n.embedding is not null
      order by (n.embedding <=> ${negVec}::vector) - (n.embedding <=> ${vec}::vector) desc
      limit 20
    `;

    return results.map((r) => ({
      id: r.id as string,
      patientId: r.patient_id as string,
      patientName: r.patient_name as string,
      authorId: r.author_id as string,
      authorName: (r.author_name as string) ?? null,
      content: r.content as string,
      createdAt: r.created_at as string,
      similarity: Number(r.similarity),
      filteredSimilarity: Number(r.filtered_similarity),
    }));
  }

  const results = await sql`
    select
      n.id, n.patient_id, n.author_id, n.content, n.created_at,
      p.name as patient_name,
      pr.name as author_name,
      (1 - (n.embedding <=> ${vec}::vector))::float as similarity
    from public.patient_notes n
    join public.patients p on p.id = n.patient_id
    left join public.profiles pr on pr.user_id = n.author_id
    where n.organization_id = ${ctx.organizationId}
      ${patientFilter}
      and n.embedding is not null
    order by n.embedding <=> ${vec}::vector
    limit 20
  `;

  return results.map((r) => ({
    id: r.id as string,
    patientId: r.patient_id as string,
    patientName: r.patient_name as string,
    authorId: r.author_id as string,
    authorName: (r.author_name as string) ?? null,
    content: r.content as string,
    createdAt: r.created_at as string,
    similarity: Number(r.similarity),
  }));
}

export async function keywordSearchNotes(
  keyword: string,
  patientId?: string,
  fuzzy?: string,
) {
  const ctx = await resolveNoteContext();
  const effectivePatientId = patientId ?? ctx.patientId;

  if (!keyword.trim() && !fuzzy?.trim()) return [];

  const patientFilter = effectivePatientId
    ? sql`and n.patient_id = ${effectivePatientId}`
    : sql``;

  const keywordFilter = keyword.trim()
    ? sql`and n.content ilike ${`%${keyword.trim()}%`}`
    : sql``;

  const fuzzyTerm = fuzzy?.trim() ?? "";
  const fuzzyFilter = fuzzyTerm
    ? sql`and ${fuzzyTerm} <% n.content`
    : sql``;

  const orderClause = fuzzyTerm
    ? sql`order by word_similarity(${fuzzyTerm}, n.content) desc`
    : sql`order by n.created_at desc`;

  const results = await sql`
    select
      n.id, n.patient_id, n.author_id, n.content, n.created_at,
      p.name as patient_name,
      pr.name as author_name
      ${fuzzyTerm ? sql`, word_similarity(${fuzzyTerm}, n.content)::float as fuzzy_score` : sql``}
    from public.patient_notes n
    join public.patients p on p.id = n.patient_id
    left join public.profiles pr on pr.user_id = n.author_id
    where n.organization_id = ${ctx.organizationId}
      ${patientFilter}
      ${keywordFilter}
      ${fuzzyFilter}
    ${orderClause}
    limit 20
  `;

  return results.map((r) => ({
    id: r.id as string,
    patientId: r.patient_id as string,
    patientName: r.patient_name as string,
    authorId: r.author_id as string,
    authorName: (r.author_name as string) ?? null,
    content: r.content as string,
    createdAt: r.created_at as string,
    fuzzyScore: r.fuzzy_score != null ? Number(r.fuzzy_score) : undefined,
  }));
}

export async function getPatients() {
  const ctx = await resolveNoteContext();

  const result = await db
    .select({ id: patients.id, name: patients.name })
    .from(patients)
    .where(eq(patients.organizationId, ctx.organizationId));

  return result;
}
