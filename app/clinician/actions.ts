"use server";

import { createClient } from "@/lib/supabase/server";
import postgres from "postgres";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

const sql = postgres(process.env.DATABASE_URL!);

export type NoteResult = {
  id: number;
  category: string;
  symptom_text: string;
  similarity: number;
};

async function requireClinician() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "clinician") {
    throw new Error("Not authorized — clinician role required");
  }
}

export async function searchNotes(query: string): Promise<NoteResult[]> {
  await requireClinician();

  const trimmed = query.trim();
  if (!trimmed) return [];

  const vec = await embedText(trimmed);
  const lit = vectorLiteral(vec);

  const rows = await sql<NoteResult[]>`
    select id,
           category,
           symptom_text,
           (1 - (embedding <=> ${lit}::vector))::float as similarity
      from public.symptom_demo
     order by embedding <=> ${lit}::vector
     limit 10
  `;

  return rows;
}
