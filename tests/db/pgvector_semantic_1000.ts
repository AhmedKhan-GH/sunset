/**
 * 1000-row semantic-search stress test for pgvector.
 *
 * 1. Generates 1000 fake hospice symptom descriptions across 7 categories
 *    using templates with slot variation (no two strings the same)
 * 2. Embeds them in batches with all-mpnet-base-v2 (768-dim)
 * 3. Bulk-inserts into public.symptom_demo, builds an HNSW cosine index
 * 4. Runs 8 semantic queries with no shared keywords with the corpus,
 *    prints the top-5 hits and a category-accuracy metric
 *
 * Run: npx tsx --env-file=.env.local tests/db/pgvector_semantic_1000.ts
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

const PER_CATEGORY = 143; // 143 × 7 = 1001

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ─── Symptom generators (templates + slot fillers per category) ─────────────

function genPain(n: number) {
  const sev = ["mild", "moderate", "severe", "intense", "excruciating"];
  const qual = ["sharp", "dull", "stabbing", "aching", "cramping", "burning", "pressure-like", "throbbing"];
  const part = ["lower abdomen", "upper abdomen", "right flank", "left flank", "chest", "lower back", "upper back", "right shoulder", "left hip", "head", "neck", "right knee", "left knee"];
  const onset = ["since this morning", "overnight", "for the past two hours", "since dinner last night", "after the meal", "since waking", "for two days now", "since the bath this afternoon"];
  const ratings = [4, 5, 6, 7, 8, 9, 10];
  const subj = ["Patient", "She", "He", "Mrs. Brown", "Mr. Davis", "Mom", "Dad"];
  const action = ["unable to sleep", "wincing every few minutes", "holding the area", "asking for additional medication", "doubled over", "very still, afraid to move"];
  const templates: ((..._: any[]) => string)[] = [
    () => `${pick(subj)} reports ${pick(sev)} ${pick(qual)} pain in the ${pick(part)}, ${pick(onset)}.`,
    () => `${pick(qual)} pain in ${pick(part)}, rated ${pick(ratings)}/10, ${pick(onset)}.`,
    () => `Complaining of ${pick(sev)} pain in the ${pick(part)}, ${pick(action)}.`,
    () => `${pick(part)} pain came on ${pick(onset)}, described as ${pick(qual)}.`,
    () => `${pick(subj)} ${pick(action)} due to ${pick(qual)} ${pick(part)} pain.`,
  ];
  const set = new Set<string>();
  while (set.size < n) set.add(pick(templates)());
  return [...set].map((text) => ({ category: "pain" as Category, text }));
}

function genSOB(n: number) {
  const trigger = ["walking ten feet", "climbing the stairs", "lying flat", "after eating", "while talking", "from the bedroom to the bathroom", "during the bath"];
  const symptom = ["short of breath", "gasping for air", "wheezing", "breathing heavily", "unable to catch her breath", "winded", "panting"];
  const severity = ["severely", "noticeably", "intermittently", "significantly", "increasingly"];
  const subj = ["Patient", "She", "He", "Mrs. Brown", "Mr. Davis"];
  const adjunct = ["lips look slightly blue", "respirations rapid and shallow", "using accessory muscles to breathe", "leaning forward to breathe", "pursed-lip breathing", "oxygen saturation dropped to 89%"];
  const templates: ((..._: any[]) => string)[] = [
    () => `${pick(subj)} ${pick(symptom)} after ${pick(trigger)}.`,
    () => `${pick(severity)} ${pick(symptom)}; ${pick(adjunct)}.`,
    () => `Difficulty breathing ${pick(trigger)}, ${pick(adjunct)}.`,
    () => `${pick(subj)} reports ${pick(symptom)} ${pick(trigger)}.`,
    () => `Becomes ${pick(symptom)} ${pick(trigger)}; ${pick(adjunct)}.`,
  ];
  const set = new Set<string>();
  while (set.size < n) set.add(pick(templates)());
  return [...set].map((text) => ({ category: "shortness_of_breath" as Category, text }));
}

function genNausea(n: number) {
  const verb = ["vomited", "threw up", "retched", "felt nauseous", "felt queasy"];
  const count = ["once", "twice", "three times", "multiple times", "several times"];
  const time = ["this morning", "in the past hour", "since lunch", "after taking the medication", "overnight"];
  const detail = ["unable to keep water down", "couldn't keep dinner down", "yellow bile only", "small amounts", "no relief from anti-nausea med"];
  const subj = ["Patient", "She", "He", "Mrs. Brown", "Mr. Davis"];
  const templates: ((..._: any[]) => string)[] = [
    () => `${pick(subj)} ${pick(verb)} ${pick(count)} ${pick(time)}, ${pick(detail)}.`,
    () => `Persistent nausea ${pick(time)}, ${pick(detail)}.`,
    () => `${pick(subj)} reports feeling ${pick(verb)} after the morning meds.`,
    () => `Episodes of ${pick(verb).replace("ed", "ing")} ${pick(time)}; ${pick(detail)}.`,
    () => `${pick(subj)} hasn't eaten since ${pick(time)} due to nausea.`,
  ];
  const set = new Set<string>();
  while (set.size < n) set.add(pick(templates)());
  return [...set].map((text) => ({ category: "nausea_vomiting" as Category, text }));
}

function genAnxiety(n: number) {
  const action = ["pacing the room", "wringing her hands", "calling for the nurse repeatedly", "trembling", "unable to sit still", "trying to climb out of bed", "shaking visibly"];
  const expressing = ["asking for something for her nerves", "fearful of being alone", "asking when the family will arrive", "saying she can't relax", "very tearful and worried"];
  const adjunct = ["heart rate elevated", "appears restless", "wide-eyed and tense", "quick shallow breathing"];
  const subj = ["Patient", "She", "He", "Mrs. Brown", "Mr. Davis"];
  const templates: ((..._: any[]) => string)[] = [
    () => `${pick(subj)} is ${pick(action)} and ${pick(expressing)}.`,
    () => `Restless and agitated this evening; ${pick(action)}, ${pick(adjunct)}.`,
    () => `${pick(subj)} ${pick(action)}; ${pick(expressing)}.`,
    () => `Patient ${pick(adjunct)}, ${pick(expressing)}.`,
    () => `Increasingly anxious — ${pick(action)} and ${pick(adjunct)}.`,
  ];
  const set = new Set<string>();
  while (set.size < n) set.add(pick(templates)());
  return [...set].map((text) => ({ category: "anxiety_agitation" as Category, text }));
}

function genConstipation(n: number) {
  const days = ["two", "three", "four", "five", "six"];
  const adjunct = ["abdomen feels distended and tight", "complaining of abdominal cramping", "passing only small hard stools", "trying to push but unable", "feels bloated and uncomfortable"];
  const subj = ["Patient", "She", "He", "Mrs. Brown", "Mr. Davis"];
  const templates: ((..._: any[]) => string)[] = [
    () => `${pick(subj)} hasn't had a bowel movement in ${pick(days)} days; ${pick(adjunct)}.`,
    () => `No bowel movement for ${pick(days)} days, ${pick(adjunct)}.`,
    () => `${pick(subj)} reports straining without success, ${pick(adjunct)}.`,
    () => `Bowels not opened since ${pick(days)} days ago; ${pick(adjunct)}.`,
    () => `${pick(subj)} requesting laxative; ${pick(adjunct)}.`,
  ];
  const set = new Set<string>();
  while (set.size < n) set.add(pick(templates)());
  return [...set].map((text) => ({ category: "constipation" as Category, text }));
}

function genCongestion(n: number) {
  const cough = ["coughing up", "expectorating", "bringing up", "producing"];
  const mucus = ["thick yellow mucus", "green sputum", "frothy white sputum", "blood-tinged mucus", "rattly secretions"];
  const sound = ["lungs sound coarse", "wet rattle in the chest", "audible gurgle when breathing", "rhonchi throughout", "diminished breath sounds with crackles"];
  const subj = ["Patient", "She", "He", "Mrs. Brown", "Mr. Davis"];
  const templates: ((..._: any[]) => string)[] = [
    () => `${pick(subj)} ${pick(cough)} ${pick(mucus)}; ${pick(sound)}.`,
    () => `Productive cough with ${pick(mucus)}, ${pick(sound)}.`,
    () => `${pick(subj)} sounds congested — ${pick(sound)}.`,
    () => `Persistent wet cough, ${pick(cough)} ${pick(mucus)}.`,
    () => `Increased secretions overnight; ${pick(sound)}.`,
  ];
  const set = new Set<string>();
  while (set.size < n) set.add(pick(templates)());
  return [...set].map((text) => ({ category: "congestion" as Category, text }));
}

function genFever(n: number) {
  const temp = ["100.8", "101.2", "101.7", "102.0", "102.4", "103.1", "99.9"];
  const adj = ["sweating profusely", "complaining of chills", "skin warm to touch", "shivering under blankets", "diaphoretic", "complaining of body aches", "flushed in the face"];
  const subj = ["Patient", "She", "He", "Mrs. Brown", "Mr. Davis"];
  const templates: ((..._: any[]) => string)[] = [
    () => `Temperature ${pick(temp)} this evening; ${pick(subj)} ${pick(adj)}.`,
    () => `${pick(subj)} ${pick(adj)}; temp ${pick(temp)}.`,
    () => `Fever of ${pick(temp)} noted at the morning check; ${pick(adj)}.`,
    () => `${pick(subj)} feels hot to touch — ${pick(temp)} oral, ${pick(adj)}.`,
    () => `Spike to ${pick(temp)} overnight, ${pick(adj)}.`,
  ];
  const set = new Set<string>();
  while (set.size < n) set.add(pick(templates)());
  return [...set].map((text) => ({ category: "fever" as Category, text }));
}

const QUERIES: { q: string; expected: Category }[] = [
  { q: "patient is in chest discomfort",                        expected: "pain" },
  { q: "really hard time getting air in",                       expected: "shortness_of_breath" },
  { q: "throwing up everything she eats",                       expected: "nausea_vomiting" },
  { q: "extremely worried and pacing nervously",                expected: "anxiety_agitation" },
  { q: "no bowel movement for several days, abdomen tight",     expected: "constipation" },
  { q: "noisy wet breathing with phlegm",                       expected: "congestion" },
  { q: "burning up, very high temperature",                     expected: "fever" },
  { q: "patient is sweating and shivering at the same time",    expected: "fever" },
];

function vectorLiteral(arr: number[]) {
  return `[${arr.join(",")}]`;
}

async function main() {
  console.log("Generating 1000 symptom descriptions across 7 categories…");
  const all = [
    ...genPain(PER_CATEGORY),
    ...genSOB(PER_CATEGORY),
    ...genNausea(PER_CATEGORY),
    ...genAnxiety(PER_CATEGORY),
    ...genConstipation(PER_CATEGORY),
    ...genCongestion(PER_CATEGORY),
    ...genFever(PER_CATEGORY),
  ];
  console.log(`  generated ${all.length} unique entries`);

  console.log("\nLoading sentence-transformer model (cached after first run)…");
  const t0 = Date.now();
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-mpnet-base-v2",
  );
  console.log(`  loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  console.log(`\nEmbedding ${all.length} texts in batches of 32…`);
  const tEmbed = Date.now();
  const embeddings: number[][] = [];
  const BATCH = 32;
  for (let i = 0; i < all.length; i += BATCH) {
    const texts = all.slice(i, i + BATCH).map((s) => s.text);
    const out = await embedder(texts, { pooling: "mean", normalize: true });
    // out.data is a flat Float32Array of shape [batch, 768]; out.dims has shape
    const dim = (out.dims as number[])[1];
    const flat = out.data as Float32Array;
    for (let j = 0; j < texts.length; j++) {
      embeddings.push(Array.from(flat.slice(j * dim, (j + 1) * dim)));
    }
    process.stdout.write(`\r  embedded ${Math.min(i + BATCH, all.length)}/${all.length}`);
  }
  console.log(`\n  embedded in ${((Date.now() - tEmbed) / 1000).toFixed(1)}s`);

  const sql = postgres(process.env.DATABASE_URL!);

  console.log("\nResetting symptom_demo table…");
  await sql`drop table if exists public.symptom_demo`;
  await sql`
    create table public.symptom_demo (
      id bigserial primary key,
      category text not null,
      symptom_text text not null,
      embedding vector(768) not null
    )
  `;

  console.log("Inserting rows in a single transaction…");
  const tInsert = Date.now();
  await sql.begin(async (tx) => {
    for (let i = 0; i < all.length; i++) {
      await tx`
        insert into public.symptom_demo (category, symptom_text, embedding)
        values (${all[i].category}, ${all[i].text}, ${vectorLiteral(embeddings[i])}::vector)
      `;
    }
  });
  console.log(`  inserted in ${((Date.now() - tInsert) / 1000).toFixed(1)}s`);

  console.log("Building HNSW index for cosine distance…");
  const tIdx = Date.now();
  await sql`create index symptom_demo_hnsw on public.symptom_demo using hnsw (embedding vector_cosine_ops)`;
  console.log(`  built in ${((Date.now() - tIdx) / 1000).toFixed(1)}s`);

  console.log("\n=== Semantic search ===\n");
  let totalCorrect = 0;
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

    console.log(`Query: "${q}"   (${ms}ms over 1000 rows)`);
    let correctInTop5 = 0;
    for (const r of rows) {
      const sim = (1 - r.distance).toFixed(3);
      const match = r.category === expected ? "✓" : "·";
      if (r.category === expected) correctInTop5++;
      const cat = r.category.padEnd(20);
      const text = r.symptom_text.length > 80 ? r.symptom_text.slice(0, 77) + "…" : r.symptom_text;
      console.log(`  ${match} sim=${sim}  [${cat}]  ${text}`);
    }
    console.log(`  → ${correctInTop5}/5 in expected category "${expected}"\n`);
    totalCorrect += correctInTop5;
  }

  const possible = QUERIES.length * 5;
  console.log(`Overall: ${totalCorrect}/${possible} top-5 hits in expected category (${((totalCorrect / possible) * 100).toFixed(0)}%)`);

  await sql.end();
  console.log(`\nDone. Inspect public.symptom_demo in Studio if you want.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
