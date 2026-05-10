"use server";

import { createClient } from "@/lib/supabase/server";
import { db, sql } from "@/lib/db";
import { patients, relatives } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

async function requireRelative() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

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

  return { user, relative, patient, supabase };
}

export async function getLinkedPatientNotes() {
  const { patient, supabase } = await requireRelative();

  const { data, error } = await supabase
    .from("patient_notes")
    .select("id, author_id, content, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return {
    patientName: patient.name,
    notes: (data ?? []).map((n: Record<string, unknown>) => ({
      id: n.id as string,
      content: n.content as string,
      createdAt: n.created_at as string,
      isOwnNote: false,
    })),
  };
}

export async function addNoteForLinkedPatient(formData: FormData) {
  const { user, patient, supabase } = await requireRelative();

  const content = formData.get("content");
  if (typeof content !== "string" || !content.trim()) return;

  const embedding = await embedText(content.trim());
  const vec = vectorLiteral(embedding);

  const { error } = await supabase
    .from("patient_notes")
    .insert({
      organization_id: patient.organizationId,
      patient_id: patient.id,
      author_id: user.id,
      content: content.trim(),
      embedding: vec,
    });

  if (error) throw error;

  revalidatePath("/relative/notes");
}

export async function searchLinkedPatientNotes(query: string, filterOut?: string) {
  const { patient } = await requireRelative();

  if (!query.trim()) return [];

  const embedding = await embedText(query.trim());
  const vec = vectorLiteral(embedding);

  if (filterOut?.trim()) {
    const negEmbedding = await embedText(filterOut.trim());
    const negVec = vectorLiteral(negEmbedding);

    const results = await sql`
      select
        id, content, created_at,
        (1 - (embedding <=> ${vec}::vector))::float as similarity,
        (1 - (embedding <=> ${negVec}::vector))::float as filtered_similarity
      from public.patient_notes
      where patient_id = ${patient.id}
        and embedding is not null
      order by (embedding <=> ${negVec}::vector) - (embedding <=> ${vec}::vector) desc
      limit 10
    `;

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      isOwnNote: false,
      similarity: Number(r.similarity),
      filteredSimilarity: Number(r.filtered_similarity),
    }));
  }

  const results = await sql`
    select
      id, content, created_at,
      1 - (embedding <=> ${vec}::vector) as similarity
    from public.patient_notes
    where patient_id = ${patient.id}
      and embedding is not null
    order by embedding <=> ${vec}::vector
    limit 10
  `;

  return results.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    isOwnNote: false,
    similarity: Number(r.similarity),
  }));
}

export async function keywordSearchLinkedPatientNotes(keyword: string) {
  const { patient } = await requireRelative();

  if (!keyword.trim()) return [];

  const pattern = `%${keyword.trim()}%`;

  const results = await sql`
    select id, content, created_at
    from public.patient_notes
    where patient_id = ${patient.id}
      and content ilike ${pattern}
    order by created_at desc
    limit 10
  `;

  return results.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    isOwnNote: false,
  }));
}
