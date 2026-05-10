"use server";

import { createClient } from "@/lib/supabase/server";
import postgres from "postgres";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

const sql = postgres(process.env.DATABASE_URL!);

export type NoteResult = {
  id: number;
  category: string;
  symptom_text: string;
  similarity: number;          // similarity to the main (positive) query
  filtered_similarity?: number; // similarity to the filter-out query (only when filter is set)
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

/**
 * Semantic search with optional negative filter.
 *
 * - When `filterOut` is empty: returns the 10 rows most similar to `query`.
 * - When `filterOut` is set: ranks each row by (similarity to query) minus
 *   (similarity to filterOut), so rows like the query but unlike the filter
 *   rise to the top. Rows similar to BOTH are deboosted.
 */
export async function searchNotes(
  query: string,
  filterOut?: string,
): Promise<NoteResult[]> {
  await requireClinician();

  const q = query.trim();
  if (!q) return [];

  const posVec = await embedText(q);
  const posLit = vectorLiteral(posVec);

  const filter = (filterOut ?? "").trim();
  if (!filter) {
    return sql<NoteResult[]>`
      select id,
             category,
             symptom_text,
             (1 - (embedding <=> ${posLit}::vector))::float as similarity
        from public.symptom_demo
       order by embedding <=> ${posLit}::vector asc
       limit 10
    `;
  }

  const negVec = await embedText(filter);
  const negLit = vectorLiteral(negVec);

  // Score = pos_similarity − neg_similarity; we sort DESC.
  // Equivalent SQL using distance form: ORDER BY (neg_distance − pos_distance) DESC.
  return sql<NoteResult[]>`
    select id,
           category,
           symptom_text,
           (1 - (embedding <=> ${posLit}::vector))::float as similarity,
           (1 - (embedding <=> ${negLit}::vector))::float as filtered_similarity
      from public.symptom_demo
     order by (embedding <=> ${negLit}::vector) - (embedding <=> ${posLit}::vector) desc
     limit 10
  `;
}
