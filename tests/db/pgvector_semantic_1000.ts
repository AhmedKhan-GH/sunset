/**
 * 1000-row semantic-search stress test for pgvector.
 *
 * Generators target *visual* and *structural* uniqueness — many templates
 * across multiple "note styles" (clinical shorthand, family quote, narrative,
 * SOAP-ish), with broad slot variety. After dedup we assert all 1000+ entries
 * are unique strings.
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
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SUBJECTS = ["Patient", "She", "He", "Pt", "Mrs. Brown", "Mr. Davis", "Mom", "Dad", "Mrs. Liu", "Mr. Patel", "Grandma", "Mrs. Garcia"];
const TIME_REL = ["this morning", "overnight", "earlier today", "this afternoon", "this evening", "since dinner", "since lunch", "since breakfast", "around 3 AM", "after the bath", "during the bath", "after the morning meds", "an hour ago", "20 minutes ago", "since waking", "for the past hour", "for the past few hours", "over the last day", "since yesterday afternoon"];

// ─── PAIN ────────────────────────────────────────────────────────────────────

function genPain(n: number) {
  const sev = ["mild", "moderate", "severe", "intense", "excruciating", "unbearable", "crushing", "agonizing", "debilitating", "sharp", "deep"];
  const qual = ["sharp", "dull", "stabbing", "aching", "cramping", "burning", "pressure-like", "throbbing", "shooting", "pulsating", "tearing", "gnawing", "radiating", "diffuse", "tight", "squeezing"];
  const part = ["lower abdomen", "upper abdomen", "right flank", "left flank", "chest", "central chest", "lower back", "upper back", "right shoulder", "left shoulder", "right hip", "left hip", "head", "neck", "right knee", "left knee", "jaw", "right thigh", "left thigh", "right calf", "abdominal area", "epigastric region", "right side", "left side", "between the shoulder blades"];
  const onset = ["since this morning", "overnight", "for the past two hours", "since dinner last night", "after the meal", "since waking", "for two days now", "since the bath this afternoon", "started 30 minutes ago", "since lunch", "around midnight", "since the move from the chair to the bed"];
  const ratings = [3, 4, 5, 6, 7, 8, 9, 10];
  const action = ["unable to sleep", "wincing every few minutes", "holding the area", "asking for additional medication", "doubled over", "very still, afraid to move", "guarding the area", "moaning quietly", "rocking back and forth", "tearful", "tachycardic", "diaphoretic", "withdrawing from the staff"];
  const trigger = ["worse with movement", "relieved by repositioning", "no relief from current pain regimen", "no clear trigger", "worse when she takes a deep breath", "worse on palpation", "worsens after eating", "improved by ice pack"];
  const meds = ["morphine 5mg PO", "oxycodone 5mg", "acetaminophen 650mg", "the standing dose", "PRN dose"];
  const templates: (() => string)[] = [
    () => `${pick(SUBJECTS)} reports ${pick(sev)} ${pick(qual)} pain in the ${pick(part)}, ${pick(onset)}.`,
    () => `${cap(pick(qual))} pain in ${pick(part)}, rated ${pick(ratings)}/10, ${pick(onset)}.`,
    () => `Pt c/o ${pick(sev)} ${pick(qual)} pain — ${pick(part)}. ${pick(onset)}, ${pick(trigger)}.`,
    () => `${pick(SUBJECTS)} ${pick(action)} due to ${pick(qual)} ${pick(part)} pain.`,
    () => `Pain assessment: ${pick(part)}, ${pick(qual)}, ${pick(ratings)}/10. ${cap(pick(action))}.`,
    () => `Family reports ${pick(SUBJECTS)} has been complaining of ${pick(qual)} ${pick(part)} pain ${pick(onset)}.`,
    () => `"My ${pick(part)} hurts so badly" — ${pick(SUBJECTS).toLowerCase()}. ${pick(ratings)}/10.`,
    () => `${cap(pick(part))} pain — onset ${pick(onset)}, character ${pick(qual)}, severity ${pick(sev)}.`,
    () => `Notes: ${pick(part)} pain, ${pick(sev)}. ${cap(pick(action))}, ${pick(trigger)}.`,
    () => `${pick(SUBJECTS)} ${pick(action)}; ${pick(qual)} pain in ${pick(part)}, ${pick(onset)}.`,
    () => `Breakthrough pain — ${pick(part)}, ${pick(qual)}. Last dose of ${pick(meds)} 4 hours ago.`,
    () => `New onset ${pick(qual)} pain in the ${pick(part)} ${pick(onset)}; ${pick(action)}.`,
    () => `${pick(SUBJECTS)} grimacing and ${pick(action)} from ${pick(qual)} ${pick(part)} pain.`,
    () => `${cap(pick(qual))} ${pick(part)} pain rated ${pick(ratings)}/10 by patient; ${pick(trigger)}.`,
    () => `Sudden onset ${pick(sev)} pain in the ${pick(part)}. ${pick(SUBJECTS)} ${pick(action)}.`,
  ];
  const set = new Set<string>();
  let attempts = 0;
  while (set.size < n && attempts < 50000) {
    set.add(pick(templates)());
    attempts++;
  }
  return [...set].map((text) => ({ category: "pain" as Category, text }));
}

// ─── SHORTNESS OF BREATH ─────────────────────────────────────────────────────

function genSOB(n: number) {
  const trigger = ["walking ten feet", "climbing the stairs", "lying flat", "after eating", "while talking", "from the bedroom to the bathroom", "during the bath", "while changing position", "when bending forward", "during transfer", "with light activity", "with conversation", "with personal care", "after rolling over"];
  const symptom = ["short of breath", "gasping for air", "wheezing", "breathing heavily", "unable to catch her breath", "winded", "panting", "audibly straining to breathe", "huffing", "tachypneic", "dyspneic"];
  const severity = ["severely", "noticeably", "intermittently", "significantly", "increasingly", "mildly", "markedly", "profoundly"];
  const adjunct = ["lips look slightly blue", "respirations rapid and shallow", "using accessory muscles to breathe", "leaning forward to breathe", "pursed-lip breathing", "oxygen saturation dropped to 89%", "SpO2 88% on room air", "SpO2 91% on 2L NC", "tripoding at the bedside", "nasal flaring", "respiratory rate 28", "stridorous", "audible wheeze", "appears air-hungry"];
  const adjustment = ["raised the head of the bed to 45°", "added 2L oxygen via nasal cannula", "nebulizer treatment given", "fan turned on at the bedside", "patient repositioned upright", "called for additional support"];
  const templates: (() => string)[] = [
    () => `${pick(SUBJECTS)} ${pick(symptom)} after ${pick(trigger)}.`,
    () => `${cap(pick(severity))} ${pick(symptom)}; ${pick(adjunct)}.`,
    () => `Difficulty breathing ${pick(trigger)}, ${pick(adjunct)}.`,
    () => `${pick(SUBJECTS)} reports ${pick(symptom)} ${pick(trigger)}.`,
    () => `Becomes ${pick(symptom)} ${pick(trigger)}; ${pick(adjunct)}.`,
    () => `Resp: ${pick(symptom)}, ${pick(adjunct)}.`,
    () => `${pick(SUBJECTS)} air hungry — ${pick(adjunct)}. ${cap(pick(adjustment))}.`,
    () => `New dyspnea ${pick(trigger)}; ${pick(adjunct)}.`,
    () => `Increased work of breathing — ${pick(adjunct)}. ${pick(SUBJECTS)} ${pick(symptom)}.`,
    () => `Family states ${pick(SUBJECTS).toLowerCase()} can't catch her breath ${pick(trigger)}.`,
    () => `Worsening shortness of breath ${pick(TIME_REL)}; ${pick(adjunct)}.`,
    () => `"I can't breathe well" — patient. ${cap(pick(adjunct))}.`,
    () => `${pick(SUBJECTS)} appears ${pick(symptom)} at rest; ${pick(adjunct)}.`,
    () => `Episode of ${pick(symptom)} lasting 5 minutes; ${pick(adjustment)}.`,
    () => `Resp distress ${pick(trigger)} — ${pick(adjunct)}, ${pick(symptom)}.`,
  ];
  const set = new Set<string>();
  let attempts = 0;
  while (set.size < n && attempts < 50000) {
    set.add(pick(templates)());
    attempts++;
  }
  return [...set].map((text) => ({ category: "shortness_of_breath" as Category, text }));
}

// ─── NAUSEA / VOMITING ───────────────────────────────────────────────────────

function genNausea(n: number) {
  const verb = ["vomited", "threw up", "retched", "felt nauseous", "felt queasy", "had emesis"];
  const count = ["once", "twice", "three times", "multiple times", "several times", "four times", "x1", "x2", "x3"];
  const detail = ["unable to keep water down", "couldn't keep dinner down", "yellow bile only", "small amounts", "no relief from anti-nausea med", "after taking morphine", "after the morning Boost", "non-bloody", "coffee-ground emesis", "watery", "right after the medication", "with associated abdominal cramping"];
  const med = ["ondansetron 4mg", "promethazine 12.5mg", "haloperidol 0.5mg sc", "metoclopramide", "the PRN antiemetic"];
  const templates: (() => string)[] = [
    () => `${pick(SUBJECTS)} ${pick(verb)} ${pick(count)} ${pick(TIME_REL)}, ${pick(detail)}.`,
    () => `Persistent nausea ${pick(TIME_REL)}, ${pick(detail)}.`,
    () => `${pick(SUBJECTS)} reports feeling ${pick(verb)} after the morning meds.`,
    () => `Episodes of vomiting ${pick(TIME_REL)}; ${pick(detail)}.`,
    () => `${pick(SUBJECTS)} hasn't eaten since ${pick(TIME_REL)} due to nausea.`,
    () => `Active nausea — ${pick(detail)}. ${pick(med)} given with mild relief.`,
    () => `Pt c/o nausea ${pick(TIME_REL)}; ${pick(verb)} ${pick(count)} so far.`,
    () => `Family reports ${pick(SUBJECTS).toLowerCase()} can't keep anything down — ${pick(detail)}.`,
    () => `${cap(pick(verb))} ${pick(count)} since ${pick(med)} dose; ${pick(detail)}.`,
    () => `"Everything I eat comes back up" — ${pick(SUBJECTS).toLowerCase()}. ${cap(pick(detail))}.`,
    () => `Nausea unrelieved by ${pick(med)}; ${pick(SUBJECTS).toLowerCase()} ${pick(verb)} ${pick(count)} ${pick(TIME_REL)}.`,
    () => `${pick(SUBJECTS)} dry-heaving repeatedly, ${pick(detail)}.`,
    () => `New onset nausea after ${pick(TIME_REL)}; ${pick(detail)}.`,
    () => `${pick(SUBJECTS)} refusing food and fluids; nausea ${pick(TIME_REL)}.`,
    () => `Postprandial vomiting — ${pick(SUBJECTS).toLowerCase()} ${pick(verb)} within 30 min of eating.`,
  ];
  const set = new Set<string>();
  let attempts = 0;
  while (set.size < n && attempts < 50000) {
    set.add(pick(templates)());
    attempts++;
  }
  return [...set].map((text) => ({ category: "nausea_vomiting" as Category, text }));
}

// ─── ANXIETY / AGITATION ─────────────────────────────────────────────────────

function genAnxiety(n: number) {
  const action = ["pacing the room", "wringing her hands", "calling for the nurse repeatedly", "trembling", "unable to sit still", "trying to climb out of bed", "shaking visibly", "rocking back and forth", "picking at the sheets", "fidgeting with the IV line", "tapping the bedrail repeatedly", "kicking off the blankets"];
  const expressing = ["asking for something for her nerves", "fearful of being alone", "asking when the family will arrive", "saying she can't relax", "very tearful and worried", "asking the same question over and over", "expressing fear of dying", "saying \"something is wrong\"", "calling for her late husband"];
  const adjunct = ["heart rate elevated", "appears restless", "wide-eyed and tense", "quick shallow breathing", "BP 158/92", "diaphoretic", "pupils dilated", "muscles tense"];
  const med = ["lorazepam 0.5mg", "haloperidol 0.5mg sl", "the PRN benzo", "midazolam 1mg sc"];
  const templates: (() => string)[] = [
    () => `${pick(SUBJECTS)} is ${pick(action)} and ${pick(expressing)}.`,
    () => `Restless and agitated ${pick(TIME_REL)}; ${pick(action)}, ${pick(adjunct)}.`,
    () => `${pick(SUBJECTS)} ${pick(action)}; ${pick(expressing)}.`,
    () => `${pick(SUBJECTS)} ${pick(adjunct)}, ${pick(expressing)}.`,
    () => `Increasingly anxious — ${pick(action)} and ${pick(adjunct)}.`,
    () => `Acute anxiety episode — ${pick(action)}, ${pick(expressing)}. ${cap(pick(med))} given.`,
    () => `Pt agitated, ${pick(action)}; ${pick(adjunct)}.`,
    () => `${pick(SUBJECTS)} cannot settle — ${pick(action)}, ${pick(expressing)}.`,
    () => `Family at bedside trying to calm ${pick(SUBJECTS).toLowerCase()} who is ${pick(action)}.`,
    () => `Terminal restlessness suspected — ${pick(action)}, ${pick(adjunct)}.`,
    () => `"I just can't relax" — patient. ${cap(pick(action))}, ${pick(adjunct)}.`,
    () => `${pick(SUBJECTS)} fearful and ${pick(action)} ${pick(TIME_REL)}.`,
    () => `Sundowning behaviors observed: ${pick(action)}, ${pick(expressing)}.`,
    () => `${pick(SUBJECTS)} ${pick(adjunct)}; ${pick(action)} since ${pick(TIME_REL)}.`,
    () => `Restlessness escalating; pt ${pick(action)} despite ${pick(med)} 30 min ago.`,
  ];
  const set = new Set<string>();
  let attempts = 0;
  while (set.size < n && attempts < 50000) {
    set.add(pick(templates)());
    attempts++;
  }
  return [...set].map((text) => ({ category: "anxiety_agitation" as Category, text }));
}

// ─── CONSTIPATION ────────────────────────────────────────────────────────────

function genConstipation(n: number) {
  const days = ["two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const adjunct = ["abdomen feels distended and tight", "complaining of abdominal cramping", "passing only small hard stools", "trying to push but unable", "feels bloated and uncomfortable", "rectal exam reveals firm stool", "no flatus reported either", "BS hypoactive throughout", "guarding on lower abdominal palpation", "tympanic on percussion"];
  const intervention = ["bisacodyl suppository given", "senna 17.2mg PO", "lactulose 30mL", "Miralax mixed in juice", "manual disimpaction performed", "enema given", "mineral oil tried"];
  const templates: (() => string)[] = [
    () => `${pick(SUBJECTS)} hasn't had a bowel movement in ${pick(days)} days; ${pick(adjunct)}.`,
    () => `No BM x ${pick(days)} days, ${pick(adjunct)}.`,
    () => `${pick(SUBJECTS)} reports straining without success, ${pick(adjunct)}.`,
    () => `Bowels not opened since ${pick(days)} days ago; ${pick(adjunct)}.`,
    () => `${pick(SUBJECTS)} requesting laxative; ${pick(adjunct)}.`,
    () => `Constipation noted — last BM ${pick(days)} days ago. ${cap(pick(intervention))}.`,
    () => `${cap(pick(intervention))} for constipation; pt ${pick(adjunct)}.`,
    () => `${pick(SUBJECTS)} c/o "feeling backed up"; ${pick(adjunct)}.`,
    () => `Hard, infrequent stools; last passage ${pick(days)} days back. ${cap(pick(adjunct))}.`,
    () => `Pt straining at stool ${pick(TIME_REL)}; ${pick(adjunct)}.`,
    () => `Family states ${pick(SUBJECTS).toLowerCase()} hasn't gone in ${pick(days)} days; ${pick(adjunct)}.`,
    () => `Impaction suspected — ${pick(adjunct)}. ${cap(pick(intervention))}.`,
    () => `Bowel regimen failing — ${pick(days)} days without BM, ${pick(adjunct)}.`,
    () => `${pick(SUBJECTS)} appears uncomfortable with abdominal distension; no BM x ${pick(days)} days.`,
    () => `Stool overflow suspected — small loose passage with ${pick(adjunct)}.`,
  ];
  const set = new Set<string>();
  let attempts = 0;
  while (set.size < n && attempts < 50000) {
    set.add(pick(templates)());
    attempts++;
  }
  return [...set].map((text) => ({ category: "constipation" as Category, text }));
}

// ─── CONGESTION ──────────────────────────────────────────────────────────────

function genCongestion(n: number) {
  const cough = ["coughing up", "expectorating", "bringing up", "producing"];
  const mucus = ["thick yellow mucus", "green sputum", "frothy white sputum", "blood-tinged mucus", "rattly secretions", "copious clear sputum", "foul-smelling sputum", "pink-tinged frothy sputum"];
  const sound = ["lungs sound coarse", "wet rattle in the chest", "audible gurgle when breathing", "rhonchi throughout", "diminished breath sounds with crackles", "coarse rhonchi at the bases", "audible secretions on breathing in", "death rattle developing", "wheezes scattered throughout", "stridor on inspiration"];
  const intervention = ["scopolamine patch placed", "atropine drops sl", "glycopyrrolate 0.2mg given", "head of bed elevated", "side positioning", "suctioning performed at bedside"];
  const templates: (() => string)[] = [
    () => `${pick(SUBJECTS)} ${pick(cough)} ${pick(mucus)}; ${pick(sound)}.`,
    () => `Productive cough with ${pick(mucus)}, ${pick(sound)}.`,
    () => `${pick(SUBJECTS)} sounds congested — ${pick(sound)}.`,
    () => `Persistent wet cough, ${pick(cough)} ${pick(mucus)}.`,
    () => `Increased secretions ${pick(TIME_REL)}; ${pick(sound)}.`,
    () => `${cap(pick(sound))}; ${pick(intervention)}.`,
    () => `Resp: ${pick(sound)}; ${pick(SUBJECTS).toLowerCase()} ${pick(cough)} ${pick(mucus)}.`,
    () => `Family worried about the gurgling sound; ${pick(sound)}, ${pick(intervention)}.`,
    () => `Audible secretions — ${pick(sound)}. ${cap(pick(intervention))}.`,
    () => `${pick(SUBJECTS)} unable to clear secretions; ${pick(cough)} ${pick(mucus)}.`,
    () => `Wet productive cough ${pick(TIME_REL)}; ${pick(mucus)}, ${pick(sound)}.`,
    () => `Lung sounds congested bilaterally; ${pick(SUBJECTS).toLowerCase()} ${pick(cough)} ${pick(mucus)}.`,
    () => `Terminal secretions noted — ${pick(sound)}. ${cap(pick(intervention))}.`,
    () => `${pick(SUBJECTS)} struggling with thick secretions; ${pick(cough)} ${pick(mucus)}.`,
    () => `Pt congested — ${pick(sound)}, productive cough.`,
  ];
  const set = new Set<string>();
  let attempts = 0;
  while (set.size < n && attempts < 50000) {
    set.add(pick(templates)());
    attempts++;
  }
  return [...set].map((text) => ({ category: "congestion" as Category, text }));
}

// ─── FEVER ───────────────────────────────────────────────────────────────────

function genFever(n: number) {
  const temp = ["100.4", "100.8", "101.0", "101.2", "101.4", "101.7", "102.0", "102.4", "102.7", "103.1", "103.5", "99.9"];
  const adj = ["sweating profusely", "complaining of chills", "skin warm to touch", "shivering under blankets", "diaphoretic", "complaining of body aches", "flushed in the face", "rigoring", "skin hot and dry", "alternating chills and sweats"];
  const intervention = ["acetaminophen 650mg PO given", "cool compresses to forehead", "blankets removed", "hydration encouraged", "tylenol per rectum"];
  const templates: (() => string)[] = [
    () => `Temperature ${pick(temp)} this evening; ${pick(SUBJECTS).toLowerCase()} ${pick(adj)}.`,
    () => `${pick(SUBJECTS)} ${pick(adj)}; temp ${pick(temp)}.`,
    () => `Fever of ${pick(temp)} noted at the morning check; ${pick(adj)}.`,
    () => `${pick(SUBJECTS)} feels hot to touch — ${pick(temp)} oral, ${pick(adj)}.`,
    () => `Spike to ${pick(temp)} ${pick(TIME_REL)}, ${pick(adj)}.`,
    () => `Febrile to ${pick(temp)}; ${pick(adj)}. ${cap(pick(intervention))}.`,
    () => `Vitals: T ${pick(temp)}, ${pick(adj)}.`,
    () => `Pt febrile — ${pick(temp)}, ${pick(adj)}.`,
    () => `New fever ${pick(TIME_REL)} (${pick(temp)}); ${pick(adj)}.`,
    () => `"I'm freezing" but axillary temp ${pick(temp)}; ${pick(adj)}.`,
    () => `${pick(SUBJECTS)} ${pick(adj)} despite ${pick(intervention)} 1 hour ago.`,
    () => `Persistent fever — ${pick(temp)} this check, was ${pick(temp)} earlier; ${pick(adj)}.`,
    () => `Family concerned about ${pick(SUBJECTS).toLowerCase()}'s temp of ${pick(temp)}; ${pick(adj)}.`,
    () => `Tmax today ${pick(temp)}; ${pick(SUBJECTS).toLowerCase()} ${pick(adj)}.`,
    () => `Hyperthermia noted — ${pick(temp)}, ${pick(adj)}. ${cap(pick(intervention))}.`,
  ];
  const set = new Set<string>();
  let attempts = 0;
  while (set.size < n && attempts < 50000) {
    set.add(pick(templates)());
    attempts++;
  }
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
  console.log("Generating 1000+ symptom descriptions across 7 categories…");
  const all = [
    ...genPain(PER_CATEGORY),
    ...genSOB(PER_CATEGORY),
    ...genNausea(PER_CATEGORY),
    ...genAnxiety(PER_CATEGORY),
    ...genConstipation(PER_CATEGORY),
    ...genCongestion(PER_CATEGORY),
    ...genFever(PER_CATEGORY),
  ];

  // Strict uniqueness assertion (every text appears exactly once across
  // categories — protects against accidental cross-category collisions)
  const seen = new Set<string>();
  for (const s of all) {
    if (seen.has(s.text)) {
      throw new Error(`Duplicate symptom text: ${s.text}`);
    }
    seen.add(s.text);
  }
  console.log(`  generated ${all.length} unique entries (asserted no duplicates)`);

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
