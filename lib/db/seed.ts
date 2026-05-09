import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { profiles } from "./schema";
import { createClient } from "@supabase/supabase-js";

const PLATFORM_ADMIN_EMAIL = "admin@sunset.dev";
const PLATFORM_ADMIN_PASSWORD = "admin123";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || getServiceRoleKey(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function getServiceRoleKey(): string {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is required. Run: npx supabase status to find it.",
  );
}

async function seed() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: PLATFORM_ADMIN_EMAIL,
    password: PLATFORM_ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log(`Auth user ${PLATFORM_ADMIN_EMAIL} already exists, skipping`);
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users.find(
        (u) => u.email === PLATFORM_ADMIN_EMAIL,
      );
      if (!existing) throw new Error("Could not find existing admin user");
      await insertProfile(existing.id);
      return;
    }
    throw error;
  }

  console.log(`Created auth user: ${data.user.email} (${data.user.id})`);
  await insertProfile(data.user.id);
}

async function insertProfile(userId: string) {
  const client = postgres(
    process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  );
  const db = drizzle(client);

  await db
    .insert(profiles)
    .values({ userId, role: "platform_admin" })
    .onConflictDoNothing();

  console.log(`Seeded platform_admin profile for ${userId}`);
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
