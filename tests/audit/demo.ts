/**
 * Live demonstration of audit logging.
 * Performs INSERT/UPDATE/DELETE as admin, then prints the audit rows.
 *
 * Run: npx tsx --env-file=.env.local tests/audit/demo.ts
 */
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: signIn } = await admin.auth.signInWithPassword({
    email: "admin@sunset.dev",
    password: "admin123",
  });
  console.log(`\n👤 Signed in as admin (${signIn.user!.id})\n`);

  const orgName = `Demo Org ${new Date().toLocaleTimeString()}`;
  console.log(`📝 INSERT  organizations.name = "${orgName}"`);
  const { data: row } = await admin
    .from("organizations")
    .insert({ name: orgName })
    .select()
    .single();
  console.log(`            row.id = ${row!.id}\n`);

  const renamed = orgName + " (renamed)";
  console.log(`✏️  UPDATE  organizations.name → "${renamed}"`);
  await admin.from("organizations").update({ name: renamed }).eq("id", row!.id);
  console.log("");

  console.log(`🗑️  DELETE  organizations where id = ${row!.id}`);
  await admin.from("organizations").delete().eq("id", row!.id);
  console.log("");

  console.log("─── audit.access_log captured: ─────────────────────────────────");
  const audit = await sql<
    {
      occurred_at: Date;
      action: string;
      actor_id: string;
      old_name: string | null;
      new_name: string | null;
    }[]
  >`
    select occurred_at,
           action,
           actor_id::text,
           old_data->>'name' as old_name,
           new_data->>'name' as new_name
      from audit.access_log
     where row_id = ${row!.id}
     order by occurred_at asc
  `;

  for (const r of audit) {
    const time = r.occurred_at.toISOString().slice(11, 23);
    const actor = r.actor_id?.slice(0, 8) ?? "(null)";
    const action = r.action.padEnd(7);
    const before = r.old_name ?? "—";
    const after = r.new_name ?? "—";
    console.log(`  [${time}] ${action} actor=${actor}…  old="${before}"  new="${after}"`);
  }
  console.log("─────────────────────────────────────────────────────────────────\n");

  console.log(`✅ ${audit.length} audit rows captured for that lifecycle.`);

  await sql`delete from audit.access_log where row_id = ${row!.id}`;
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
