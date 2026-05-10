"use server";

import { createClient } from "@/lib/supabase/server";
import { db, sql } from "@/lib/db";
import { profiles, practitioners, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

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

  return { user, profile: profile as typeof profile & { organizationId: string }, supabase };
}

async function requireNoteAccess(patientId: string) {
  const { user, profile, supabase } = await requireOrganizationPractitioner();

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));

  if (!patient || patient.organizationId !== profile.organizationId)
    redirect("/organization/patients");

  return { user, profile, patient, supabase };
}

export async function getPatientNotes(patientId: string) {
  const { supabase } = await requireNoteAccess(patientId);

  const { data, error } = await supabase
    .from("patient_notes")
    .select("id, author_id, content, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const practitionerRows = await db
    .select()
    .from(practitioners);

  const practitionerByUserId = Object.fromEntries(
    practitionerRows.map((p) => [p.userId, p]),
  );

  return data.map((n: Record<string, unknown>) => ({
    id: n.id as string,
    content: n.content as string,
    createdAt: n.created_at as string,
    authorId: n.author_id as string,
    authorName: practitionerByUserId[n.author_id as string]?.specialty ?? "Practitioner",
  }));
}

export async function createPatientNote(patientId: string, formData: FormData) {
  const { user, profile, supabase } = await requireNoteAccess(patientId);

  const content = formData.get("content");
  if (typeof content !== "string" || !content.trim()) return;

  const embedding = await embedText(content.trim());
  const vec = vectorLiteral(embedding);

  const { error } = await supabase
    .from("patient_notes")
    .insert({
      organization_id: profile.organizationId,
      patient_id: patientId,
      author_id: user.id,
      content: content.trim(),
      embedding: vec,
    });

  if (error) throw error;

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
