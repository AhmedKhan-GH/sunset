/**
 * Quick CLI test for semantic search over patient_notes.
 * Run: npx tsx --env-file=.env.local lib/db/test-embed.ts
 */
import postgres from "postgres";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

const sql = postgres(process.env.DATABASE_URL!);

const QUERIES = [
  "patient is anxious overnight",
  "trouble breathing",
  "no bowel movement",
  "fever",
];

async function main() {
  for (const q of QUERIES) {
    const v = await embedText(q);
    const lit = vectorLiteral(v);
    const rows = await sql<
      {
        patient_name: string;
        content: string;
        similarity: number;
      }[]
    >`
      select p.name as patient_name,
             n.content,
             1 - (n.embedding <=> ${lit}::vector) as similarity
        from public.patient_notes n
        join public.patients p on p.id = n.patient_id
       where n.embedding is not null
       order by n.embedding <=> ${lit}::vector
       limit 3
    `;
    console.log(`\nQ: "${q}"`);
    for (const r of rows) {
      const sim = Number(r.similarity).toFixed(3);
      const text = r.content.length > 80 ? r.content.slice(0, 77) + "…" : r.content;
      console.log(`  sim=${sim}  [${r.patient_name}]  ${text}`);
    }
  }
  await sql.end();
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
