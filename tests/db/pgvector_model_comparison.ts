/**
 * Head-to-head benchmark of two embedding models on the same corpus and
 * queries. Computes cosine similarity in-memory (no DB writes) so the run
 * is fully deterministic for both models.
 *
 * Run: npx tsx --env-file=.env.local tests/db/pgvector_model_comparison.ts
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

const QUERIES: { q: string; expected: Category | "ambiguous" }[] = [
  // Original 8 (more direct phrasing)
  { q: "patient is in chest discomfort",                        expected: "pain" },
  { q: "really hard time getting air in",                       expected: "shortness_of_breath" },
  { q: "throwing up everything she eats",                       expected: "nausea_vomiting" },
  { q: "extremely worried and pacing nervously",                expected: "anxiety_agitation" },
  { q: "no bowel movement for several days, abdomen tight",     expected: "constipation" },
  { q: "noisy wet breathing with phlegm",                       expected: "congestion" },
  { q: "burning up, very high temperature",                     expected: "fever" },
  { q: "patient is sweating and shivering at the same time",    expected: "fever" },
  // New 10 (more colloquial / harder)
  { q: "feels feverish and exhausted",                          expected: "fever" },
  { q: "constantly rocking back and forth in bed",              expected: "anxiety_agitation" },
  { q: "lungs sound like they're full of fluid",                expected: "congestion" },
  { q: "her belly looks huge and feels hard",                   expected: "constipation" },
  { q: "everything she swallows comes back up",                 expected: "nausea_vomiting" },
  { q: "patient keeps grabbing at her chest",                   expected: "pain" },
  { q: "really struggling to take a deep breath",               expected: "shortness_of_breath" },
  { q: "muscle aches with a high temp",                         expected: "fever" },
  { q: "patient seems exhausted and unwell",                    expected: "ambiguous" },
  { q: "can't keep food or water down",                         expected: "nausea_vomiting" },
];

type ModelSpec = {
  label: string;
  path: string;
  // Some models (BGE) recommend a special prefix on the query side
  queryPrefix?: string;
};

const MODELS: ModelSpec[] = [
  { label: "all-mpnet-base-v2 (current)", path: "Xenova/all-mpnet-base-v2" },
  {
    label: "bge-base-en-v1.5",
    path: "Xenova/bge-base-en-v1.5",
    queryPrefix:
      "Represent this sentence for searching relevant passages: ",
  },
];

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function topK<T>(items: T[], scorer: (t: T) => number, k: number) {
  return [...items]
    .map((t) => ({ t, score: scorer(t) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.t);
}

async function benchmark(spec: ModelSpec, corpus: { category: string; text: string }[]) {
  console.log(`\n──── ${spec.label} ────`);
  console.log("  loading…");
  const embedder = await pipeline("feature-extraction", spec.path);

  console.log("  embedding corpus…");
  const t0 = Date.now();
  const corpusVecs: number[][] = [];
  const BATCH = 32;
  for (let i = 0; i < corpus.length; i += BATCH) {
    const texts = corpus.slice(i, i + BATCH).map((s) => s.text);
    const out = await embedder(texts, { pooling: "mean", normalize: true });
    const dim = (out.dims as number[])[1];
    const flat = out.data as Float32Array;
    for (let j = 0; j < texts.length; j++) {
      corpusVecs.push(Array.from(flat.slice(j * dim, (j + 1) * dim)));
    }
  }
  const embedMs = Date.now() - t0;
  console.log(`  embedded ${corpus.length} rows in ${(embedMs / 1000).toFixed(1)}s (${(embedMs / corpus.length).toFixed(1)} ms/row)`);

  let totalCorrect = 0;
  let scoredQs = 0;
  let totalQueryMs = 0;
  const perQuery: { q: string; expected: string; correct: number; topCategory: string }[] = [];

  for (const { q, expected } of QUERIES) {
    const queryText = (spec.queryPrefix ?? "") + q;
    const tQ = Date.now();
    const out = await embedder(queryText, { pooling: "mean", normalize: true });
    const qVec = Array.from(out.data as Float32Array);

    // Cosine similarity = dot product (vectors are L2-normalized)
    const top = topK(
      corpus.map((row, i) => ({ row, sim: dot(qVec, corpusVecs[i]) })),
      (x) => x.sim,
      5,
    );
    totalQueryMs += Date.now() - tQ;

    const inExpected =
      expected === "ambiguous"
        ? 0
        : top.filter((x) => x.row.category === expected).length;

    if (expected !== "ambiguous") {
      totalCorrect += inExpected;
      scoredQs++;
    }
    perQuery.push({
      q,
      expected,
      correct: inExpected,
      topCategory: top[0].row.category,
    });
  }

  const possible = scoredQs * 5;
  const pct = ((totalCorrect / possible) * 100).toFixed(1);
  console.log(`  top-5 accuracy: ${totalCorrect}/${possible} (${pct}%)`);
  console.log(`  avg query latency: ${(totalQueryMs / QUERIES.length).toFixed(0)} ms (incl. embedding)`);

  return { spec, totalCorrect, possible, pct, perQuery, embedMs };
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  const corpus = await sql<{ category: string; symptom_text: string }[]>`
    select category, symptom_text from public.symptom_demo order by id
  `;
  if (corpus.length === 0) {
    console.error("symptom_demo is empty — run pgvector_semantic_1000.ts first");
    process.exit(1);
  }
  const data = corpus.map((r) => ({ category: r.category, text: r.symptom_text }));
  console.log(`Corpus: ${data.length} rows, ${QUERIES.length} queries (${QUERIES.filter((q) => q.expected !== "ambiguous").length} scored)`);

  await sql.end();

  const results = [];
  for (const spec of MODELS) {
    results.push(await benchmark(spec, data));
  }

  console.log("\n────────── SUMMARY ──────────");
  console.log(`${"Model".padEnd(35)}  Top-5 accuracy   Embed speed`);
  for (const r of results) {
    console.log(
      `${r.spec.label.padEnd(35)}  ${(r.totalCorrect + "/" + r.possible).padEnd(8)} (${r.pct}%)   ${(r.embedMs / 1000).toFixed(1)}s`,
    );
  }

  console.log("\n────────── PER-QUERY DELTAS ──────────");
  console.log(`${"Query".padEnd(50)}  ${results.map((r) => r.spec.label.split(" ")[0].padEnd(20)).join("  ")}`);
  for (let i = 0; i < QUERIES.length; i++) {
    const q = QUERIES[i].q;
    const cells = results.map((r) => {
      const p = r.perQuery[i];
      if (p.expected === "ambiguous") return `(top: ${p.topCategory})`.padEnd(20);
      return `${p.correct}/5 (top: ${p.topCategory})`.padEnd(20);
    });
    console.log(`${q.padEnd(50)}  ${cells.join("  ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
