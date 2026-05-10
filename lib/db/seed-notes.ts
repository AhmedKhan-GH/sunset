/**
 * Seed sample clinical notes (with embeddings) for every demo patient.
 * Run this AFTER `npm run db:seed` so the patients exist.
 *
 *   npx tsx --env-file=.env.local lib/db/seed-notes.ts
 *
 * Each patient gets 4-6 realistic clinical notes embedded via the local
 * mpnet model. Idempotent: skips patients that already have notes.
 */
import postgres from "postgres";
import { embedText, vectorLiteral } from "@/lib/llm/embed";
import { db } from "@/lib/db";
import { patients, practitioners } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const sql = postgres(process.env.DATABASE_URL!);

// Pool of clinical-style notes. The seeder picks 4-6 per patient at random.
const NOTE_POOL: string[] = [
  "Patient reports pain 6/10 today in lower abdomen. Took oxycodone 5mg at 2pm with partial relief by 3pm. Encourage non-pharm comfort measures.",
  "Pain assessment: chest pressure, 4/10, intermittent. No SOB at rest. Last dose of morphine 4 hours ago, breakthrough PRN dose available.",
  "Episode of dyspnea after walking 10 feet to bathroom. SpO2 dropped to 89% on room air, recovered to 94% after 2L nasal cannula. Position change helped.",
  "Increased work of breathing this evening; using accessory muscles, RR 28. Family at bedside, head of bed elevated to 45 degrees.",
  "Vomited x2 in past hour, unable to keep water down. Ondansetron 4mg SL given with relief within 20 min. Tolerating sips of broth.",
  "Persistent nausea since morning meds; refusing breakfast. Will hold next dose of laxative until nausea improves.",
  "Patient anxious overnight, pacing bedroom and asking repeatedly for late husband. PRN lorazepam 0.5mg given at 2am with calming effect within 30 min.",
  "Restlessness escalating despite 2 PRN doses today. Considering scheduled low-dose haloperidol; will discuss with attending in AM.",
  "No bowel movement in 4 days. Abdomen distended and tender on palpation. Bisacodyl suppository given at 4pm; will reassess in morning.",
  "Bowels not opened x 5 days despite senna + Miralax. Manual disimpaction performed with patient comfort medication on board. Result: large hard stool.",
  "Productive cough this morning, expectorating thick yellow sputum. Lung sounds coarse bilaterally. Encouraged increased fluids.",
  "Wet rattle audible at bedside; family asking about sounds. Glycopyrrolate 0.2mg SC given, scopolamine patch in place. Side positioning improved comfort.",
  "Temperature 102.1 oral at evening check. Patient diaphoretic and complaining of body aches. Acetaminophen 650mg PO given.",
  "Fever persistent at 101.4 despite acetaminophen 1 hour ago. Patient alternating chills and sweats. Will reassess in 2 hours, hydration encouraged.",
  "Patient ate small amount of soup at lunch — first food in 24 hours. Spirits brighter today; visited with daughter for over an hour.",
  "Decline noted: requires more assistance with transfers, sleeping more. Family aware. Discussed comfort-focused goals at length.",
  "Pressure ulcer stage 2 on left heel. Heel boots placed bilaterally, repositioning q2h. Will monitor and apply skin barrier daily.",
  "Patient declined medication this morning citing nausea. PRN antiemetic offered first; meds resumed by 11am.",
  "Foley catheter discontinued today after trial of void successful. Voiding adequate amounts, no signs of retention.",
  "Daughter expressed concern about increased confusion overnight. Reviewed sundowning patterns with her, suggested calm environment and minimal stimulation after 6pm.",
  "Edema noted in lower extremities, +2 pitting bilaterally. Will elevate legs when in chair, monitor for worsening.",
  "Pain regimen adjusted: increased basal morphine to address breakthrough frequency. Will monitor effectiveness over next 24 hours.",
  "Patient verbalizing fear of dying alone. Offered presence and listening. Connected family members for video call. Tearful but settled afterward.",
  "Overall comfortable today. Sleeping intermittently, alert when family visits. No new complaints. Medications well tolerated.",
  "Hospice IDT meeting completed. Plan reviewed: continue current pain regimen, increase psychosocial support, dietary as tolerated. Family in agreement.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function main() {
  console.log("Seeding clinical notes for demo patients...\n");

  const allPatients = await db.select().from(patients);
  if (allPatients.length === 0) {
    console.log("No patients found. Run `npm run db:seed` first.");
    process.exit(1);
  }

  // Get one practitioner per organization to use as the author.
  const allPractitioners = await db.select().from(practitioners);
  const practitionerByOrg = new Map<string, string>();
  for (const p of allPractitioners) {
    if (!practitionerByOrg.has(p.organizationId)) {
      practitionerByOrg.set(p.organizationId, p.userId);
    }
  }

  let totalNotesAdded = 0;

  for (const patient of allPatients) {
    const existingCount = await sql<{ count: number }[]>`
      select count(*)::int as count
        from public.patient_notes
       where patient_id = ${patient.id}
    `;
    if (existingCount[0].count > 0) {
      console.log(`  ↻ ${patient.name} already has ${existingCount[0].count} notes, skipping`);
      continue;
    }

    const authorId = practitionerByOrg.get(patient.organizationId);
    if (!authorId) {
      console.log(`  ✗ ${patient.name}: no practitioner in org ${patient.organizationId}, skipping`);
      continue;
    }

    const noteCount = 4 + Math.floor(Math.random() * 3); // 4-6 notes
    const selected = pickN(NOTE_POOL, noteCount);

    for (const content of selected) {
      const embedding = await embedText(content);
      const vec = vectorLiteral(embedding);
      await sql`
        insert into public.patient_notes
          (organization_id, patient_id, author_id, content, embedding)
        values
          (${patient.organizationId}, ${patient.id}, ${authorId}, ${content}, ${vec}::vector)
      `;
      totalNotesAdded++;
    }
    console.log(`  ✓ ${patient.name}: added ${noteCount} notes`);
  }

  console.log(`\nDone. ${totalNotesAdded} notes added across ${allPatients.length} patients.`);
  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
