import dotenv from "dotenv";
import fs from "fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { profiles, organizations, practitioners, patients, relatives } from "./schema";
import { createClient } from "@supabase/supabase-js";
import { embedText, vectorLiteral } from "../llm/embed";
import { patientNotesData } from "./seed-notes";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY required. Run: npx supabase status",
      );
    })(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const client = postgres(
  process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);
const db = drizzle(client);

async function getOrCreateAuthUser(
  email: string,
  password: string,
): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === email);
      if (!existing) throw new Error(`Could not find existing user: ${email}`);
      return existing.id;
    }
    throw error;
  }

  return data.user.id;
}

async function seed() {
  console.log("\nrunning drizzle migrations");
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("\ncreating patient_notes table");
  const patientNotesSql = fs.readFileSync("./supabase/snippets/patient_notes.sql", "utf8");
  await client.unsafe(patientNotesSql);

  console.log("\nenabling realtime + audit triggers");
  await client.unsafe(`
    alter publication supabase_realtime add table public.patient_notes;
    alter table public.patient_notes replica identity full;

    create trigger audit_patient_notes_insert
      after insert on public.patient_notes
      for each row execute function audit.log_change('note.created');

    create trigger audit_patients_insert
      after insert on public.patients
      for each row execute function audit.log_change('patient.created');

    create trigger audit_patients_update
      after update on public.patients
      for each row execute function audit.log_change('patient.updated');

    create trigger audit_relatives_insert
      after insert on public.relatives
      for each row execute function audit.log_change('relative.added');

    create trigger audit_relatives_delete
      after delete on public.relatives
      for each row execute function audit.log_change('relative.removed');

    create trigger audit_practitioners_insert
      after insert on public.practitioners
      for each row execute function audit.log_change('practitioner.added');
  `);

  // ── Platform admin ──────────────────────────────────────────────────────
  console.log("\nplatform admin");
  const platformAdminId = await getOrCreateAuthUser(
    "admin@sunset.dev",
    "admin123",
  );
  await db
    .insert(profiles)
    .values({ userId: platformAdminId, name: "Platform Admin", role: "platform_admin" })
    .onConflictDoNothing();

  // ── Organizations ───────────────────────────────────────────────────────
  console.log("\norganizations");
  const [sunriseHospice] = await db
    .insert(organizations)
    .values({ name: "Sunrise Hospice" })
    .returning();
  const [harborPalliative] = await db
    .insert(organizations)
    .values({ name: "Harbor Palliative Care" })
    .returning();
  console.log(`  ${sunriseHospice.name}, ${harborPalliative.name}`);

  // ── Organization admins ─────────────────────────────────────────────────
  console.log("\norganization admins");
  const sunriseAdminId = await getOrCreateAuthUser(
    "maria.santos@sunset.dev",
    "admin123",
  );
  await db.insert(profiles).values({
    userId: sunriseAdminId,
    name: "Maria Santos",
    role: "organization_admin",
    organizationId: sunriseHospice.id,
  });

  const harborAdminId = await getOrCreateAuthUser(
    "david.chen@sunset.dev",
    "admin123",
  );
  await db.insert(profiles).values({
    userId: harborAdminId,
    name: "David Chen",
    role: "organization_admin",
    organizationId: harborPalliative.id,
  });

  // ── Practitioners ───────────────────────────────────────────────────────
  console.log("\npractitioners");

  const practitionerData = [
    { email: "dr.amara.okafor@sunset.dev", name: "Dr. Amara Okafor", organizationId: sunriseHospice.id, specialty: "Palliative Medicine", licenseNumber: "MD-2019-44821", npi: "1234567890" },
    { email: "dr.james.whitfield@sunset.dev", name: "Dr. James Whitfield", organizationId: sunriseHospice.id, specialty: "Geriatric Medicine", licenseNumber: "MD-2015-31205", npi: "2345678901" },
    { email: "nurse.priya.sharma@sunset.dev", name: "Priya Sharma, RN", organizationId: sunriseHospice.id, specialty: "Hospice Nursing", licenseNumber: "RN-2018-78432", npi: "3456789012" },
    { email: "dr.elena.rodriguez@sunset.dev", name: "Dr. Elena Rodriguez", organizationId: harborPalliative.id, specialty: "Pain Management", licenseNumber: "MD-2017-55910", npi: "4567890123" },
    { email: "nurse.ben.tanaka@sunset.dev", name: "Ben Tanaka, RN", organizationId: harborPalliative.id, specialty: "Palliative Nursing", licenseNumber: "RN-2020-62187", npi: "5678901234" },
  ];

  const practitionerRecords: Record<string, string> = {};
  const practitionerUserIds: Record<string, string> = {};
  for (const p of practitionerData) {
    const userId = await getOrCreateAuthUser(p.email, "admin123");
    await db.insert(profiles).values({
      userId,
      name: p.name,
      role: "practitioner",
      organizationId: p.organizationId,
    });
    const [practitioner] = await db.insert(practitioners).values({
      userId,
      organizationId: p.organizationId,
      specialty: p.specialty,
      licenseNumber: p.licenseNumber,
      npi: p.npi,
    }).returning();
    practitionerRecords[p.email] = practitioner.id;
    practitionerUserIds[p.email] = userId;
    console.log(`  ${p.email} (${p.specialty})`);
  }

  // ── Patients ────────────────────────────────────────────────────────────
  console.log("\npatients");

  const patientData = [
    {
      email: "dorothy.williams@sunset.dev",
      name: "Dorothy Williams",
      dateOfBirth: "1938-07-22",
      gender: "female",
      organizationId: sunriseHospice.id,
      practitionerEmail: "dr.amara.okafor@sunset.dev",
    },
    {
      email: "robert.jackson@sunset.dev",
      name: "Robert Jackson",
      dateOfBirth: "1941-11-03",
      gender: "male",
      organizationId: sunriseHospice.id,
      practitionerEmail: "dr.amara.okafor@sunset.dev",
    },
    {
      email: "margaret.chen@sunset.dev",
      name: "Margaret Chen",
      dateOfBirth: "1935-02-14",
      gender: "female",
      organizationId: sunriseHospice.id,
      practitionerEmail: "dr.james.whitfield@sunset.dev",
    },
    {
      email: "harold.thompson@sunset.dev",
      name: "Harold Thompson",
      dateOfBirth: "1943-09-28",
      gender: "male",
      organizationId: sunriseHospice.id,
      practitionerEmail: "nurse.priya.sharma@sunset.dev",
    },
    {
      email: "evelyn.garcia@sunset.dev",
      name: "Evelyn Garcia",
      dateOfBirth: "1937-04-10",
      gender: "female",
      organizationId: harborPalliative.id,
      practitionerEmail: "dr.elena.rodriguez@sunset.dev",
    },
    {
      email: "james.washington@sunset.dev",
      name: "James Washington",
      dateOfBirth: "1940-12-01",
      gender: "male",
      organizationId: harborPalliative.id,
      practitionerEmail: "dr.elena.rodriguez@sunset.dev",
    },
    {
      email: "helen.kim@sunset.dev",
      name: "Helen Kim",
      dateOfBirth: "1932-06-18",
      gender: "female",
      organizationId: harborPalliative.id,
      practitionerEmail: "nurse.ben.tanaka@sunset.dev",
    },
    {
      email: null,
      name: "Arthur Patel",
      dateOfBirth: "1939-01-25",
      gender: "male",
      organizationId: sunriseHospice.id,
      practitionerEmail: "dr.james.whitfield@sunset.dev",
    },
    {
      email: null,
      name: "Gloria Nguyen",
      dateOfBirth: "1944-08-07",
      gender: "female",
      organizationId: harborPalliative.id,
      practitionerEmail: "nurse.ben.tanaka@sunset.dev",
    },
  ];

  const patientRecords: Record<string, string> = {};
  for (const p of patientData) {
    const userId = p.email
      ? await getOrCreateAuthUser(p.email, "admin123")
      : undefined;

    if (userId) {
      await db.insert(profiles).values({
        userId,
        name: p.name,
        role: "patient",
        organizationId: p.organizationId,
      });
    }

    const [patient] = await db
      .insert(patients)
      .values({
        organizationId: p.organizationId,
        practitionerId: practitionerRecords[p.practitionerEmail],
        userId,
        name: p.name,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
      })
      .returning();

    patientRecords[p.name] = patient.id;
    console.log(`  ${p.name}${p.email ? "" : " (no portal login)"}`);
  }

  // ── Relatives ───────────────────────────────────────────────────────────
  console.log("\nrelatives");

  const relativeData = [
    {
      email: "carol.williams@sunset.dev",
      name: "Carol Williams",
      relationship: "child" as const,
      patientName: "Dorothy Williams",
    },
    {
      email: "michael.williams@sunset.dev",
      name: "Michael Williams",
      relationship: "child" as const,
      patientName: "Dorothy Williams",
    },
    {
      email: "linda.jackson@sunset.dev",
      name: "Linda Jackson",
      relationship: "spouse" as const,
      patientName: "Robert Jackson",
    },
    {
      email: "steven.jackson@sunset.dev",
      name: "Steven Jackson",
      relationship: "child" as const,
      patientName: "Robert Jackson",
    },
    {
      email: "henry.chen@sunset.dev",
      name: "Henry Chen",
      relationship: "child" as const,
      patientName: "Margaret Chen",
    },
    {
      email: "betty.thompson@sunset.dev",
      name: "Betty Thompson",
      relationship: "spouse" as const,
      patientName: "Harold Thompson",
    },
    {
      email: "carlos.garcia@sunset.dev",
      name: "Carlos Garcia",
      relationship: "spouse" as const,
      patientName: "Evelyn Garcia",
    },
    {
      email: "patricia.garcia@sunset.dev",
      name: "Patricia Garcia",
      relationship: "child" as const,
      patientName: "Evelyn Garcia",
    },
    {
      email: "ruth.washington@sunset.dev",
      name: "Ruth Washington",
      relationship: "spouse" as const,
      patientName: "James Washington",
    },
    {
      email: "susan.kim@sunset.dev",
      name: "Susan Kim",
      relationship: "child" as const,
      patientName: "Helen Kim",
    },
    {
      email: null,
      name: "Thomas Kim",
      relationship: "child" as const,
      patientName: "Helen Kim",
    },
    {
      email: null,
      name: "Anita Patel",
      relationship: "spouse" as const,
      patientName: "Arthur Patel",
    },
  ];

  const patientOrgMap = Object.fromEntries(
    patientData.map((p) => [p.name, p.organizationId]),
  );

  for (const r of relativeData) {
    const userId = r.email
      ? await getOrCreateAuthUser(r.email, "admin123")
      : undefined;

    if (userId) {
      await db.insert(profiles).values({
        userId,
        name: r.name,
        role: "relative",
        organizationId: patientOrgMap[r.patientName],
      });
    }

    await db.insert(relatives).values({
      patientId: patientRecords[r.patientName],
      userId,
      name: r.name,
      relationship: r.relationship,
    });

    console.log(
      `  ${r.name} (${r.relationship} of ${r.patientName})${r.email ? "" : " (no portal login)"}`,
    );
  }

  // ── Patient Notes ──────────────────────────────────────────────────────
  console.log(`\npatient notes (generating embeddings for ${patientNotesData.length} notes...)`);

  let notesInserted = 0;
  for (const note of patientNotesData) {
    const patientId = patientRecords[note.patientName];
    const authorId = practitionerUserIds[note.authorEmail];
    const organizationId = practitionerData.find(
      (p) => p.email === note.authorEmail,
    )!.organizationId;

    const embedding = await embedText(note.content);
    const vec = vectorLiteral(embedding);

    await client`
      insert into public.patient_notes
        (organization_id, patient_id, author_id, content, embedding)
      values
        (${organizationId}, ${patientId}, ${authorId}, ${note.content}, ${vec}::vector)
    `;

    notesInserted++;
    if (notesInserted % 25 === 0) {
      console.log(`  ${notesInserted}/${patientNotesData.length} notes embedded`);
    }
  }

  await client.end();
  console.log("\n✓ seed complete");
  console.log(
    `  ${Object.keys(practitionerRecords).length + 3} staff accounts, ` +
      `${patientData.length} patients, ` +
      `${relativeData.length} relatives, ` +
      `${notesInserted} clinical notes`,
  );
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
