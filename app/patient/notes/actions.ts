"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { embedText, vectorLiteral } from "@/lib/llm/embed";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function requirePatient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, user.id));

  if (!patient) redirect("/");
  return { user, patient };
}

export async function getMyNotes() {
  const { patient } = await requirePatient();

  const notes = await sql`
    select id, author_id, content, created_at
    from public.patient_notes
    where patient_id = ${patient.id}
    order by created_at desc
    limit 50
  `;

  return notes.map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.created_at,
    isOwnNote: n.author_id === patient.userId,
  }));
}

export async function addMyNote(formData: FormData) {
  const { user, patient } = await requirePatient();

  const content = formData.get("content");
  if (typeof content !== "string" || !content.trim()) return;

  const embedding = await embedText(content.trim());
  const vec = vectorLiteral(embedding);

  await sql`
    insert into public.patient_notes
      (organization_id, patient_id, author_id, content, embedding)
    values
      (${patient.organizationId}, ${patient.id}, ${user.id}, ${content.trim()}, ${vec}::vector)
  `;

  revalidatePath("/patient/notes");
}

export async function searchMyNotes(query: string) {
  const { patient } = await requirePatient();

  if (!query.trim()) return [];

  const embedding = await embedText(query.trim());
  const vec = vectorLiteral(embedding);

  const results = await sql`
    select
      id, content, created_at, author_id,
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
    isOwnNote: r.author_id === patient.userId,
    similarity: Number(r.similarity),
  }));
}
