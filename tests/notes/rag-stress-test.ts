/**
 * RAG / patient_notes stress test.
 *
 * Tests the embedding + search pipeline directly (no LLM required).
 * Uses an isolated temp table so production patient_notes is untouched.
 *
 * Phases:
 *   1. Generate 1000 synthetic notes across 7 symptom categories
 *   2. Embed (timed) and bulk-insert (timed)
 *   3. Build HNSW index (timed)
 *   4. Run latency suite — N queries, p50/p95/p99 latency
 *   5. Run accuracy suite — known-category queries, top-K hit rate
 *   6. Run edge cases — empty, single-char, paragraph, special chars
 *   7. Cleanup
 *
 * Run: npx tsx --env-file=.env.local tests/notes/rag-stress-test.ts
 */
import postgres from "postgres";
import { embedText, vectorLiteral } from "@/lib/llm/embed";

type Category =
  | "pain"
  | "shortness_of_breath"
  | "nausea_vomiting"
  | "anxiety_agitation"
  | "constipation"
  | "congestion"
  | "fever";

const PER_CATEGORY = 50; // 50 * 7 = 350 (kept small enough to finish in <90s)
const sql = postgres(process.env.DATABASE_URL!);

// Disable stdout buffering — node buffers when piping. We want live progress.
if (process.stdout.isTTY === false) {
  // @ts-ignore — _handle exists on tty/pipe streams
  if (process.stdout._handle?.setBlocking) process.stdout._handle.setBlocking(true);
}

// ── Templates per category (compressed; same shape as production seed). ──

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

function genPain(n: number) {
  const sev = ["mild", "moderate", "severe", "intense", "excruciating"];
  const qual = ["sharp", "dull", "stabbing", "aching", "cramping", "burning", "pressure-like", "throbbing"];
  const part = ["lower abdomen", "upper abdomen", "chest", "right flank", "lower back", "right shoulder", "head", "neck", "right knee", "left hip"];
  const rate = [4, 5, 6, 7, 8, 9, 10];
  const onset = ["since this morning", "overnight", "after the meal", "an hour ago", "for two days now"];
  const tpl: (() => string)[] = [
    () => `Patient reports ${pick(sev)} ${pick(qual)} pain in the ${pick(part)}, ${pick(onset)}.`,
    () => `${pick(qual)} pain in ${pick(part)}, rated ${pick(rate)}/10, ${pick(onset)}.`,
    () => `Pt c/o ${pick(sev)} pain — ${pick(part)}. ${pick(onset)}, worse with movement.`,
    () => `Complaining of ${pick(sev)} pain in ${pick(part)}, holding the area.`,
    () => `Pain assessment: ${pick(part)}, ${pick(qual)}, ${pick(rate)}/10. Wincing.`,
  ];
  const s = new Set<string>();
  while (s.size < n) s.add(pick(tpl)());
  return [...s].map((text) => ({ category: "pain" as Category, text }));
}

function genSOB(n: number) {
  const trigger = ["walking ten feet", "lying flat", "after eating", "while talking", "during the bath"];
  const sym = ["short of breath", "gasping for air", "wheezing", "winded", "tachypneic"];
  const adj = ["lips slightly blue", "respirations rapid", "using accessory muscles", "leaning forward to breathe", "SpO2 dropped to 89%"];
  const tpl: (() => string)[] = [
    () => `Patient ${pick(sym)} after ${pick(trigger)}.`,
    () => `Difficulty breathing ${pick(trigger)}, ${pick(adj)}.`,
    () => `Markedly ${pick(sym)}; ${pick(adj)}.`,
    () => `Increased work of breathing — ${pick(adj)}, ${pick(sym)}.`,
    () => `Resp distress ${pick(trigger)} — ${pick(adj)}.`,
  ];
  const s = new Set<string>();
  while (s.size < n) s.add(pick(tpl)());
  return [...s].map((text) => ({ category: "shortness_of_breath" as Category, text }));
}

function genNausea(n: number) {
  const verb = ["vomited", "threw up", "retched", "felt nauseous"];
  const cnt = ["once", "twice", "three times", "multiple times"];
  const detail = ["unable to keep water down", "couldn't keep dinner down", "yellow bile only", "no relief from antiemetic"];
  const tpl: (() => string)[] = [
    () => `Patient ${pick(verb)} ${pick(cnt)} this morning, ${pick(detail)}.`,
    () => `Persistent nausea ${pick(cnt)} since lunch, ${pick(detail)}.`,
    () => `Episodes of vomiting overnight; ${pick(detail)}.`,
    () => `Hasn't eaten since this morning due to nausea.`,
    () => `${pick(verb)} after morning meds; ${pick(detail)}.`,
  ];
  const s = new Set<string>();
  while (s.size < n) s.add(pick(tpl)());
  return [...s].map((text) => ({ category: "nausea_vomiting" as Category, text }));
}

function genAnxiety(n: number) {
  const action = ["pacing the room", "wringing her hands", "calling for the nurse repeatedly", "trembling", "rocking back and forth"];
  const expr = ["asking for nerves medication", "fearful of being alone", "saying she can't relax", "tearful and worried"];
  const adj = ["heart rate elevated", "appears restless", "wide-eyed and tense"];
  const tpl: (() => string)[] = [
    () => `Patient is ${pick(action)} and ${pick(expr)}.`,
    () => `Restless and agitated; ${pick(action)}, ${pick(adj)}.`,
    () => `Increasingly anxious — ${pick(action)} and ${pick(adj)}.`,
    () => `Patient ${pick(adj)}, ${pick(expr)}.`,
    () => `Acute anxiety — ${pick(action)}, ${pick(expr)}.`,
  ];
  const s = new Set<string>();
  while (s.size < n) s.add(pick(tpl)());
  return [...s].map((text) => ({ category: "anxiety_agitation" as Category, text }));
}

function genConstipation(n: number) {
  const days = ["two", "three", "four", "five", "six"];
  const adj = ["abdomen feels distended and tight", "complaining of abdominal cramping", "passing only small hard stools", "trying to push but unable", "feels bloated"];
  const tpl: (() => string)[] = [
    () => `Patient hasn't had a bowel movement in ${pick(days)} days; ${pick(adj)}.`,
    () => `No BM x ${pick(days)} days, ${pick(adj)}.`,
    () => `Reports straining without success, ${pick(adj)}.`,
    () => `Bowels not opened since ${pick(days)} days ago; ${pick(adj)}.`,
    () => `Requesting laxative; ${pick(adj)}.`,
  ];
  const s = new Set<string>();
  while (s.size < n) s.add(pick(tpl)());
  return [...s].map((text) => ({ category: "constipation" as Category, text }));
}

function genCongestion(n: number) {
  const cough = ["coughing up", "expectorating", "bringing up", "producing"];
  const mucus = ["thick yellow mucus", "green sputum", "blood-tinged mucus", "rattly secretions", "frothy white sputum"];
  const sound = ["lungs sound coarse", "wet rattle in the chest", "audible gurgle when breathing", "rhonchi throughout"];
  const tpl: (() => string)[] = [
    () => `Patient ${pick(cough)} ${pick(mucus)}; ${pick(sound)}.`,
    () => `Productive cough with ${pick(mucus)}, ${pick(sound)}.`,
    () => `Sounds congested — ${pick(sound)}.`,
    () => `Persistent wet cough, ${pick(cough)} ${pick(mucus)}.`,
    () => `Increased secretions overnight; ${pick(sound)}.`,
  ];
  const s = new Set<string>();
  while (s.size < n) s.add(pick(tpl)());
  return [...s].map((text) => ({ category: "congestion" as Category, text }));
}

function genFever(n: number) {
  const temp = ["100.8", "101.2", "101.7", "102.0", "102.4", "103.1"];
  const adj = ["sweating profusely", "complaining of chills", "skin warm to touch", "shivering under blankets", "diaphoretic", "complaining of body aches"];
  const tpl: (() => string)[] = [
    () => `Temperature ${pick(temp)} this evening; patient ${pick(adj)}.`,
    () => `Patient ${pick(adj)}; temp ${pick(temp)}.`,
    () => `Fever of ${pick(temp)} noted; ${pick(adj)}.`,
    () => `Spike to ${pick(temp)} overnight, ${pick(adj)}.`,
    () => `Febrile to ${pick(temp)} — ${pick(adj)}.`,
  ];
  const s = new Set<string>();
  while (s.size < n) s.add(pick(tpl)());
  return [...s].map((text) => ({ category: "fever" as Category, text }));
}

// ── Test queries with expected categories ──

const ACCURACY_QUERIES: { q: string; expected: Category }[] = [
  { q: "patient is in chest discomfort",                        expected: "pain" },
  { q: "really hard time getting air in",                       expected: "shortness_of_breath" },
  { q: "throwing up everything she eats",                       expected: "nausea_vomiting" },
  { q: "extremely worried and pacing nervously",                expected: "anxiety_agitation" },
  { q: "no bowel movement for several days, abdomen tight",     expected: "constipation" },
  { q: "noisy wet breathing with phlegm",                       expected: "congestion" },
  { q: "burning up, very high temperature",                     expected: "fever" },
  { q: "patient is sweating and shivering at the same time",    expected: "fever" },
  { q: "lungs sound like they're full of fluid",                expected: "congestion" },
  { q: "her belly looks huge and feels hard",                   expected: "constipation" },
  { q: "really struggling to take a deep breath",               expected: "shortness_of_breath" },
  { q: "muscle aches with a high temp",                         expected: "fever" },
];

// ── Stats helpers ──

function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

async function setup() {
  console.log("Setting up isolated stress_test_notes table…");
  await sql`drop table if exists public.stress_test_notes`;
  await sql`
    create table public.stress_test_notes (
      id uuid primary key default gen_random_uuid(),
      category text not null,
      content text not null,
      embedding vector(768)
    )
  `;
}

async function teardown() {
  console.log("\nTearing down stress_test_notes table…");
  await sql`drop table if exists public.stress_test_notes`;
}

async function phase1_generate() {
  const all = [
    ...genPain(PER_CATEGORY),
    ...genSOB(PER_CATEGORY),
    ...genNausea(PER_CATEGORY),
    ...genAnxiety(PER_CATEGORY),
    ...genConstipation(PER_CATEGORY),
    ...genCongestion(PER_CATEGORY),
    ...genFever(PER_CATEGORY),
  ];
  const seen = new Set<string>();
  for (const r of all) {
    if (seen.has(r.text)) throw new Error("Duplicate generated: " + r.text);
    seen.add(r.text);
  }
  console.log(`\n[Phase 1] Generated ${all.length} unique notes`);
  return all;
}

async function phase2_embed_and_insert(rows: { category: string; text: string }[]) {
  console.log(`\n[Phase 2] Embedding + inserting ${rows.length} notes`);
  const embedTimes: number[] = [];
  const insertTimes: number[] = [];
  const tStart = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tEmbed = Date.now();
    const v = await embedText(r.text);
    embedTimes.push(Date.now() - tEmbed);
    const lit = vectorLiteral(v);
    const tInsert = Date.now();
    await sql`
      insert into public.stress_test_notes (category, content, embedding)
      values (${r.category}, ${r.text}, ${lit}::vector)
    `;
    insertTimes.push(Date.now() - tInsert);
    if ((i + 1) % 100 === 0) {
      process.stdout.write(`\r  ${i + 1}/${rows.length}`);
    }
  }
  process.stdout.write(`\r  ${rows.length}/${rows.length}\n`);
  console.log(`  total: ${((Date.now() - tStart) / 1000).toFixed(1)}s`);
  console.log(`  embed:  avg ${avg(embedTimes)}ms · p50 ${pct(embedTimes, 50)}ms · p95 ${pct(embedTimes, 95)}ms · p99 ${pct(embedTimes, 99)}ms`);
  console.log(`  insert: avg ${avg(insertTimes)}ms · p50 ${pct(insertTimes, 50)}ms · p95 ${pct(insertTimes, 95)}ms · p99 ${pct(insertTimes, 99)}ms`);
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

async function phase3_index() {
  console.log(`\n[Phase 3] Building HNSW index`);
  const t = Date.now();
  await sql`create index stress_test_hnsw on public.stress_test_notes using hnsw (embedding vector_cosine_ops)`;
  console.log(`  built in ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

async function searchTopK(query: string, k: number) {
  const v = await embedText(query);
  const lit = vectorLiteral(v);
  const rows = await sql<{ category: string; content: string; similarity: number }[]>`
    select category, content, 1 - (embedding <=> ${lit}::vector) as similarity
      from public.stress_test_notes
     order by embedding <=> ${lit}::vector
     limit ${k}
  `;
  return rows;
}

async function phase4_latency() {
  console.log(`\n[Phase 4] Latency suite — 50 queries, top-5`);
  const queries = [
    ...ACCURACY_QUERIES.map((q) => q.q),
    "what's been happening with this patient today",
    "any signs of worsening overnight",
    "pain and discomfort",
    "respiratory distress",
    "GI symptoms",
    "behavioral changes",
    "vital sign anomalies",
    "medication response",
    "family concerns",
    "skin condition",
    // pad to 50
    ...Array.from({ length: 28 }, (_, i) => `clinical observation number ${i}`),
  ];
  const latencies: number[] = [];
  for (const q of queries) {
    const t = Date.now();
    await searchTopK(q, 5);
    latencies.push(Date.now() - t);
  }
  console.log(`  query latency (incl. embedding):`);
  console.log(`    avg ${avg(latencies)}ms · p50 ${pct(latencies, 50)}ms · p95 ${pct(latencies, 95)}ms · p99 ${pct(latencies, 99)}ms`);
}

async function phase5_accuracy() {
  console.log(`\n[Phase 5] Accuracy suite — top-5 category match`);
  let totalCorrect = 0;
  let totalPossible = 0;
  for (const { q, expected } of ACCURACY_QUERIES) {
    const rows = await searchTopK(q, 5);
    const correct = rows.filter((r) => r.category === expected).length;
    totalCorrect += correct;
    totalPossible += 5;
    const status = correct >= 3 ? "✓" : correct >= 1 ? "·" : "✗";
    console.log(`  ${status} ${correct}/5  "${q}"  → expected ${expected}`);
  }
  const pctScore = ((totalCorrect / totalPossible) * 100).toFixed(1);
  console.log(`\n  Overall: ${totalCorrect}/${totalPossible} (${pctScore}%) top-5 hits in expected category`);
}

async function phase6_edge_cases() {
  console.log(`\n[Phase 6] Edge cases`);

  // Single character query
  try {
    const t = Date.now();
    const rows = await searchTopK("a", 3);
    console.log(`  ✓ single-char query returned ${rows.length} rows in ${Date.now() - t}ms`);
  } catch (e: any) {
    console.log(`  ✗ single-char query crashed: ${e.message}`);
  }

  // Very long query (paragraph)
  const longQ = "the patient has been experiencing significant difficulty with breathing especially when lying down flat and has reported feeling exhausted and unwell with persistent nausea and a fever that fluctuates throughout the day along with constipation that has not responded to standard interventions and increasing anxiety which manifests as restlessness and pacing during the night hours when the family is asleep";
  try {
    const t = Date.now();
    const rows = await searchTopK(longQ, 3);
    console.log(`  ✓ long-paragraph query (${longQ.length} chars) returned ${rows.length} rows in ${Date.now() - t}ms`);
  } catch (e: any) {
    console.log(`  ✗ long-paragraph query crashed: ${e.message}`);
  }

  // Special characters / SQL-injection-like
  try {
    const t = Date.now();
    const rows = await searchTopK("'; DROP TABLE patient_notes; --", 3);
    console.log(`  ✓ SQL-injection-like query returned ${rows.length} rows in ${Date.now() - t}ms (parameters bound safely)`);
    // Verify table still exists
    const check = await sql`select count(*)::int as c from public.patient_notes`;
    console.log(`  ✓ public.patient_notes still has ${check[0].c} rows after injection attempt`);
  } catch (e: any) {
    console.log(`  ✗ SQL-injection query crashed: ${e.message}`);
  }

  // Unicode / non-English
  try {
    const t = Date.now();
    const rows = await searchTopK("le patient a une douleur intense au ventre", 3);
    console.log(`  ✓ French query returned ${rows.length} rows in ${Date.now() - t}ms`);
    if (rows.length > 0) {
      console.log(`    top hit category: ${rows[0].category} (sim ${rows[0].similarity.toFixed(3)})`);
    }
  } catch (e: any) {
    console.log(`  ✗ French query crashed: ${e.message}`);
  }

  // Whitespace-only
  try {
    const t = Date.now();
    const rows = await searchTopK("   ", 3);
    console.log(`  · whitespace-only query returned ${rows.length} rows in ${Date.now() - t}ms (model embeds it)`);
  } catch (e: any) {
    console.log(`  ✗ whitespace-only query crashed: ${e.message}`);
  }
}

async function phase7_concurrency() {
  console.log(`\n[Phase 7] Concurrency — 10 parallel searches`);
  const queries = [
    "chest pain", "fever", "nausea", "anxiety", "breathing",
    "constipation", "wet cough", "agitation", "dyspnea", "vomiting",
  ];
  const t = Date.now();
  const results = await Promise.all(queries.map((q) => searchTopK(q, 5)));
  const total = Date.now() - t;
  const allReturned = results.every((r) => r.length === 5);
  console.log(`  ✓ 10 parallel searches completed in ${total}ms (${(total / 10).toFixed(0)}ms avg)`);
  console.log(`  ✓ all returned 5 results: ${allReturned}`);
}

async function main() {
  console.log("=== RAG / patient_notes stress test ===");
  try {
    await setup();
    const all = await phase1_generate();
    await phase2_embed_and_insert(all);
    await phase3_index();
    await phase4_latency();
    await phase5_accuracy();
    await phase6_edge_cases();
    await phase7_concurrency();
  } finally {
    await teardown();
    await sql.end();
  }
  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error("\nFAIL:", e);
  process.exit(1);
});
