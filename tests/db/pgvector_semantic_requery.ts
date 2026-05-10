/**
 * Re-query an existing public.symptom_demo (1001 rows already embedded)
 * with a fresh set of queries. Doesn't touch the corpus.
 *
 * Run: npx tsx --env-file=.env.local tests/db/pgvector_semantic_requery.ts
 */
import { pipeline } from "@xenova/transformers";
import postgres from "postgres";

type Category =
  | "pain"
  | "shortness_of_breath"
  | "nausea_vomiting"
  | "anxiety_agitation"
  | "constipation"
  | "congestion"
  | "fever";

// Mix of colloquial, clinical, ambiguous, and emotional phrasing.
const QUERIES: { q: string; expected: Category | "ambiguous" }[] = [
  { q: "feels feverish and exhausted",                expected: "fever" },
  { q: "constantly rocking back and forth in bed",    expected: "anxiety_agitation" },
  { q: "lungs sound like they're full of fluid",      expected: "congestion" },
  { q: "her belly looks huge and feels hard",         expected: "constipation" },
  { q: "everything she swallows comes back up",       expected: "nausea_vomiting" },
  { q: "patient keeps grabbing at her chest",         expected: "pain" },
  { q: "really struggling to take a deep breath",     expected: "shortness_of_breath" },
  { q: "muscle aches with a high temp",               expected: "fever" },
  { q: "patient seems exhausted and unwell",          expected: "ambiguous" },
  { q: "can't keep food or water down",               expected: "nausea_vomiting" },
];

function vectorLiteral(arr: number[]) {
  return `[${arr.join(",")}]`;
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  // Sanity check the corpus exists
  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int from public.symptom_demo
  `;
  if (count === 0) {
    console.error("public.symptom_demo is empty — run pgvector_semantic_1000.ts first.");
    process.exit(1);
  }
  console.log(`Corpus: ${count} rows in public.symptom_demo\n`);

  console.log("Loading embedder…");
  const embedder = await pipeline("feature-extraction", "Xenova/all-mpnet-base-v2");

  console.log(`Running ${QUERIES.length} fresh queries (corpus untouched)…\n`);
  let totalCorrect = 0;
  let scoredQueries = 0;

  for (const { q, expected } of QUERIES) {
    const out = await embedder(q, { pooling: "mean", normalize: true });
    const qv = vectorLiteral(Array.from(out.data as Float32Array));

    const tQ = Date.now();
    const rows = await sql<
      { category: string; symptom_text: string; distance: number }[]
    >`
      select category, symptom_text, (embedding <=> ${qv}::vector) as distance
        from public.symptom_demo
       order by embedding <=> ${qv}::vector
       limit 5
    `;
    const ms = Date.now() - tQ;

    console.log(`Query: "${q}"   (${ms}ms over ${count} rows)`);
    let correct = 0;
    for (const r of rows) {
      const sim = (1 - r.distance).toFixed(3);
      const isExpected = expected !== "ambiguous" && r.category === expected;
      const mark = isExpected ? "✓" : "·";
      if (isExpected) correct++;
      const cat = r.category.padEnd(20);
      const text = r.symptom_text.length > 78 ? r.symptom_text.slice(0, 75) + "…" : r.symptom_text;
      console.log(`  ${mark} sim=${sim}  [${cat}]  ${text}`);
    }
    if (expected === "ambiguous") {
      console.log(`  → no expected category (intentionally ambiguous)\n`);
    } else {
      console.log(`  → ${correct}/5 in expected "${expected}"\n`);
      totalCorrect += correct;
      scoredQueries++;
    }
  }

  const possible = scoredQueries * 5;
  console.log(
    `Overall (excl. ambiguous): ${totalCorrect}/${possible} top-5 hits in expected category (${((totalCorrect / possible) * 100).toFixed(0)}%)`,
  );

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
