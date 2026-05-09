/**
 * Dev-only seed data for manual UI/RLS verification.
 *
 * Adds:
 *   - 2 extra users (nurse, caregiver) on top of the platform admin from seed.ts
 *   - 5 sample organizations
 *
 * Idempotent: re-running won't duplicate. Run after seed.ts:
 *
 *   npx tsx --env-file=.env.local lib/db/seed.ts        # platform admin (Ahmed's bootstrap)
 *   npx tsx --env-file=.env.local lib/db/seed-dev.ts    # this file (dev fixtures)
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { profiles, organizations } from "./schema";

type SeedUser = {
  email: string;
  password: string;
  role: "platform_admin" | "clinician" | "caregiver";
};

const USERS: SeedUser[] = [
  { email: "nurse@sunset.dev",     password: "nurse123",     role: "clinician" },
  { email: "caregiver@sunset.dev", password: "caregiver123", role: "caregiver" },
];

const ORG_NAMES = [
  "Pacific Hospice Care",
  "Sunset Memorial Care",
  "Mission Bay Hospice",
  "Bayside Comfort Care",
  "Coastal End-of-Life Services",
];

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required.");
  console.error("Run: npx tsx --env-file=.env.local lib/db/seed-dev.ts");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const sql = postgres(
  process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);
const db = drizzle(sql);

async function findUserByEmail(client: SupabaseClient, email: string) {
  const { data } = await client.auth.admin.listUsers();
  return data?.users.find((u) => u.email === email) ?? null;
}

async function seedUser(u: SeedUser) {
  let userId: string;

  const existing = await findUserByEmail(supabase, u.email);
  if (existing) {
    console.log(`  ↻ user ${u.email} already exists`);
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`  ✓ created user ${u.email}`);
  }

  await db
    .insert(profiles)
    .values({ userId, role: u.role })
    .onConflictDoNothing();
  console.log(`  ✓ profile { user_id: ${userId}, role: ${u.role} }`);
}

async function seedOrg(name: string) {
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, name));
  if (existing.length > 0) {
    console.log(`  ↻ org "${name}" already exists`);
    return;
  }
  await db.insert(organizations).values({ name });
  console.log(`  ✓ org "${name}"`);
}

async function main() {
  console.log("Seeding dev users…");
  for (const u of USERS) await seedUser(u);

  console.log("\nSeeding organizations…");
  for (const name of ORG_NAMES) await seedOrg(name);

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => sql.end());
