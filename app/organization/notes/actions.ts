"use server";

import { createClient } from "@/lib/supabase/server";
import { db, sql } from "@/lib/db";
import { profiles, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

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

  return { user, profile: profile as typeof profile & { organizationId: string }, supabase };
}

export async function getOrganizationNotes(patientId?: string) {
  const { supabase } = await requireOrganizationMember();

  let query = supabase
    .from("patient_notes")
    .select("id, patient_id, author_id, content, created_at, patients(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (patientId) {
    query = query.eq("patient_id", patientId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((n: Record<string, unknown>) => ({
    id: n.id as string,
    patientId: n.patient_id as string,
    patientName: (n.patients as { name: string } | null)?.name ?? "Unknown",
    content: n.content as string,
    createdAt: n.created_at as string,
    authorId: n.author_id as string,
  }));
}

export async function searchOrganizationNotes(
  query: string,
  patientId?: string,
  filterOut?: string,
) {
  const { profile } = await requireOrganizationMember();

  if (!query.trim()) return [];

  const embedding = await embedText(query.trim());
  const vec = vectorLiteral(embedding);

  const patientFilter = patientId
    ? sql`and n.patient_id = ${patientId}`
    : sql``;

  if (filterOut?.trim()) {
    const negEmbedding = await embedText(filterOut.trim());
    const negVec = vectorLiteral(negEmbedding);

    const results = await sql`
      select
        n.id, n.patient_id, n.content, n.created_at,
        p.name as patient_name,
        (1 - (n.embedding <=> ${vec}::vector))::float as similarity,
        (1 - (n.embedding <=> ${negVec}::vector))::float as filtered_similarity
      from public.patient_notes n
      join public.patients p on p.id = n.patient_id
      where n.organization_id = ${profile.organizationId}
        ${patientFilter}
        and n.embedding is not null
      order by (n.embedding <=> ${negVec}::vector) - (n.embedding <=> ${vec}::vector) desc
      limit 20
    `;

    return results.map((r) => ({
      id: r.id,
      patientId: r.patient_id,
      patientName: r.patient_name,
      content: r.content,
      createdAt: r.created_at,
      similarity: Number(r.similarity),
      filteredSimilarity: Number(r.filtered_similarity),
    }));
  }

  const results = await sql`
    select
      n.id, n.patient_id, n.content, n.created_at,
      p.name as patient_name,
      1 - (n.embedding <=> ${vec}::vector) as similarity
    from public.patient_notes n
    join public.patients p on p.id = n.patient_id
    where n.organization_id = ${profile.organizationId}
      ${patientFilter}
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

export async function keywordSearchOrganizationNotes(
  keyword: string,
  patientId?: string,
  fuzzy?: string,
) {
  const { profile } = await requireOrganizationMember();

  if (!keyword.trim() && !fuzzy?.trim()) return [];

  const patientFilter = patientId
    ? sql`and n.patient_id = ${patientId}`
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
      n.id, n.patient_id, n.content, n.created_at,
      p.name as patient_name
      ${fuzzyTerm ? sql`, word_similarity(${fuzzyTerm}, n.content)::float as fuzzy_score` : sql``}
    from public.patient_notes n
    join public.patients p on p.id = n.patient_id
    where n.organization_id = ${profile.organizationId}
      ${patientFilter}
      ${keywordFilter}
      ${fuzzyFilter}
    ${orderClause}
    limit 20
  `;

  return results.map((r) => ({
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patient_name,
    content: r.content,
    createdAt: r.created_at,
    fuzzyScore: r.fuzzy_score != null ? Number(r.fuzzy_score) : undefined,
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
