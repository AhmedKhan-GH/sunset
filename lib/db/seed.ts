import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { profiles, organizations, patients, relatives } from "./schema";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY required. Run: npx supabase status");
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
      console.log(`  auth user exists: ${email} (${existing.id})`);
      return existing.id;
    }
    throw error;
  }

  console.log(`  created auth user: ${email} (${data.user.id})`);
  return data.user.id;
}

async function seed() {
  console.log("\n[0/6] running migrations");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("  migrations applied");

  // 1. Platform admin
  console.log("\n[1/6] platform admin");
  const platformAdminId = await getOrCreateAuthUser(
    "admin@sunset.dev",
    "admin123",
  );
  await db
    .insert(profiles)
    .values({ userId: platformAdminId, role: "platform_admin" })
    .onConflictDoNothing();

  // 2. Organization
  console.log("\n[2/6] organization");
  let [organization] = await db
    .insert(organizations)
    .values({ name: "Sunrise Hospice" })
    .onConflictDoNothing()
    .returning();

  if (!organization) {
    [organization] = await db.select().from(organizations).limit(1);
    console.log(`  organization exists: ${organization.name} (${organization.id})`);
  } else {
    console.log(`  created organization: ${organization.name} (${organization.id})`);
  }

  // 3. Organization admin
  console.log("\n[3/6] organization admin");
  const organizationAdminId = await getOrCreateAuthUser(
    "organization-admin@sunset.dev",
    "admin123",
  );
  await db
    .insert(profiles)
    .values({
      userId: organizationAdminId,
      role: "organization_admin",
      organizationId: organization.id,
    })
    .onConflictDoNothing();

  // 4. Practitioner
  console.log("\n[4/6] practitioner");
  const practitionerId = await getOrCreateAuthUser(
    "practitioner@sunset.dev",
    "admin123",
  );
  await db
    .insert(profiles)
    .values({
      userId: practitionerId,
      role: "practitioner",
      organizationId: organization.id,
    })
    .onConflictDoNothing();

  // 5. Patient
  console.log("\n[5/6] patient");
  const patientUserId = await getOrCreateAuthUser(
    "patient@sunset.dev",
    "admin123",
  );
  let [patient] = await db
    .insert(patients)
    .values({
      organizationId: organization.id,
      practitionerId,
      userId: patientUserId,
      name: "John Doe",
      dateOfBirth: "1940-03-15",
      gender: "male",
    })
    .onConflictDoNothing()
    .returning();

  if (!patient) {
    [patient] = await db.select().from(patients).limit(1);
    console.log(`  patient exists: ${patient.name} (${patient.id})`);
  } else {
    console.log(`  created patient: ${patient.name} (${patient.id})`);
  }

  // 6. Relative
  console.log("\n[6/6] relative");
  const relativeUserId = await getOrCreateAuthUser(
    "relative@sunset.dev",
    "admin123",
  );
  const existingRelatives = await db
    .select()
    .from(relatives)
    .where(eq(relatives.patientId, patient.id));

  if (existingRelatives.length === 0) {
    const [relative] = await db
      .insert(relatives)
      .values({
        patientId: patient.id,
        userId: relativeUserId,
        name: "Jane Doe",
        relationship: "spouse",
      })
      .returning();
    console.log(`  created relative: ${relative.name} (${relative.relationship})`);
  } else if (!existingRelatives[0].userId) {
    await db
      .update(relatives)
      .set({ userId: relativeUserId })
      .where(eq(relatives.id, existingRelatives[0].id));
    console.log(
      `  linked auth user to existing relative: ${existingRelatives[0].name}`,
    );
  } else {
    console.log(`  relative already linked: ${existingRelatives[0].name}`);
  }

  await client.end();
  console.log("\n✓ seed complete");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
