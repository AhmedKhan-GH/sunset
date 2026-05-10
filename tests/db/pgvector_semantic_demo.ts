/**
 * Live semantic-search demo for pgvector.
 *
 * 1. Embeds 12 fake hospice symptom descriptions with all-mpnet-base-v2
 *    (768-dim, same dim as the schema's vector(768) columns)
 * 2. Stores them in a public.symptom_demo table
 * 3. Runs 4 semantic queries with different phrasing and prints the top-3
 *    most similar symptoms by cosine distance
 *
 * First run downloads the model (~110 MB) into ~/.cache/huggingface; later
 * runs load from disk in a few seconds.
 *
 * Run: npx tsx --env-file=.env.local tests/db/pgvector_semantic_demo.ts
 */
import { pipeline } from "@xenova/transformers";
import postgres from "postgres";

const SYMPTOMS: { id: string; text: string; category: string }[] = [
  { id: "s01", category: "pain",          text: "Severe sharp pain in lower right abdomen, started this morning" },
  { id: "s02", category: "pain",          text: "Patient reports 8/10 pressure-like pain in the center of the chest" },
  { id: "s03", category: "shortness",     text: "Difficulty breathing, especially when lying flat" },
  { id: "s04", category: "shortness",     text: "Can't catch her breath after walking only ten feet" },
  { id: "s05", category: "nausea",        text: "Vomited twice in the last hour and can't keep water down" },
  { id: "s06", category: "nausea",        text: "Persistent nausea since yesterday morning, hasn't eaten" },
  { id: "s07", category: "anxiety",       text: "Patient is restless, pacing the room, won't settle down" },
  { id: "s08", category: "anxiety",       text: "Trembling and asking repeatedly for something for her nerves" },
  { id: "s09", category: "constipation",  text: "Hasn't had a bowel movement in four days, abdomen feels tight" },
  { id: "s10", category: "congestion",    text: "Coughing up thick yellow mucus, chest sounds wet and rattly" },
  { id: "s11", category: "fever",         text: "Temperature is 102.3 degrees, sweating but says she feels cold" },
  { id: "s12", category: "fever",         text: "Forehead hot to the touch, chills, complaining of body aches" },
];

const QUERIES = [
  "the patient is having chest pain",
  "trouble breathing while lying down",
  "feeling sick to the stomach",
  "very anxious and won't sit still",
];

function vectorLiteral(arr: number[]) {
  return `[${arr.join(",")}]`;
}

async function main() {
  console.log("Loading sentence-transformer model (first run ~30s)…");
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-mpnet-base-v2",
  );

  async function embed(text: string): Promise<number[]> {
    const out = await embedder(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array);
  }

  const sql = postgres(process.env.DATABASE_URL!);

  console.log("\nResetting symptom_demo table…");
  await sql`drop table if exists public.symptom_demo`;
  await sql`
    create table public.symptom_demo (
      id text primary key,
      category text not null,
      symptom_text text not null,
      embedding vector(768) not null
    )
  `;

  console.log(`Embedding ${SYMPTOMS.length} symptoms…`);
  for (const s of SYMPTOMS) {
    const v = await embed(s.text);
    await sql`
      insert into public.symptom_demo (id, category, symptom_text, embedding)
      values (${s.id}, ${s.category}, ${s.text}, ${vectorLiteral(v)}::vector)
    `;
  }

  console.log(`\nRunning ${QUERIES.length} semantic queries…\n`);
  for (const q of QUERIES) {
    const qv = await embed(q);
    const rows = await sql<
      { id: string; category: string; symptom_text: string; distance: number }[]
    >`
      select id,
             category,
             symptom_text,
             (embedding <=> ${vectorLiteral(qv)}::vector) as distance
        from public.symptom_demo
       order by embedding <=> ${vectorLiteral(qv)}::vector
       limit 3
    `;
    console.log(`Query: "${q}"`);
    for (const r of rows) {
      const sim = (1 - r.distance).toFixed(3);
      console.log(`  ${r.id}  sim=${sim}  [${r.category.padEnd(12)}]  ${r.symptom_text}`);
    }
    console.log("");
  }

  await sql.end();
  console.log("Done. Inspect public.symptom_demo in Studio if you want to poke around.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
