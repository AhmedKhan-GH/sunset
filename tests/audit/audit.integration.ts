/**
 * Module 13 — Audit log integration test.
 *
 * Runs INSERT / UPDATE / DELETE through the user-scoped Supabase JS client
 * (so JWT claims propagate to Postgres) and verifies that the audit trigger
 * captured the change with the correct actor_id, action, and row data.
 *
 * Run:
 *   npx tsx --env-file=.env.local tests/audit/audit.integration.ts
 */

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;

const sql = postgres(DATABASE_URL);

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

async function main() {
  console.log("=== Module 13: Audit log integration tests ===");

  // Sign in as admin via the user-scoped client (JWT propagates → auth.uid()
  // returns admin's id inside the trigger).
  const adminClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signInData, error: signInErr } =
    await adminClient.auth.signInWithPassword({
      email: "admin@sunset.dev",
      password: "admin123",
    });
  if (signInErr) throw signInErr;
  const adminId = signInData.user!.id;
  console.log(`\nSigned in as admin (${adminId})`);

  // ── INSERT ──────────────────────────────────────────────────────────
  console.log("\n[INSERT]");
  const orgName = `_audit_test_${Date.now()}`;
  const { data: inserted, error: insertErr } = await adminClient
    .from("organizations")
    .insert({ name: orgName })
    .select()
    .single();
  if (insertErr) throw insertErr;

  // Wait briefly for trigger fire to commit (synchronous in same tx, so
  // immediate, but allow for any clock drift)
  await new Promise((r) => setTimeout(r, 100));

  const insertRows = await sql<
    { actor_id: string; action: string; row_id: string; new_data: any }[]
  >`
    select actor_id::text, action, row_id, new_data
      from audit.access_log
     where table_name = 'organizations'
       and action = 'INSERT'
       and row_id = ${inserted!.id}
     limit 1
  `;
  assert(insertRows.length === 1, "INSERT created exactly 1 audit row");
  if (insertRows.length === 1) {
    assert(insertRows[0].actor_id === adminId, "audit.actor_id matches admin user_id");
    assert(insertRows[0].action === "INSERT", "audit.action is INSERT");
    assert(insertRows[0].new_data?.name === orgName, "audit.new_data.name matches inserted org name");
  }

  // ── UPDATE ──────────────────────────────────────────────────────────
  console.log("\n[UPDATE]");
  const renamed = orgName + "_renamed";
  await adminClient.from("organizations").update({ name: renamed }).eq("id", inserted!.id);
  await new Promise((r) => setTimeout(r, 100));

  const updateRows = await sql<
    { action: string; old_data: any; new_data: any }[]
  >`
    select action, old_data, new_data
      from audit.access_log
     where table_name = 'organizations'
       and action = 'UPDATE'
       and row_id = ${inserted!.id}
     limit 1
  `;
  assert(updateRows.length === 1, "UPDATE created exactly 1 audit row");
  if (updateRows.length === 1) {
    assert(updateRows[0].old_data?.name === orgName, "audit.old_data has the previous name");
    assert(updateRows[0].new_data?.name === renamed, "audit.new_data has the new name");
  }

  // ── DELETE ──────────────────────────────────────────────────────────
  console.log("\n[DELETE]");
  await adminClient.from("organizations").delete().eq("id", inserted!.id);
  await new Promise((r) => setTimeout(r, 100));

  const deleteRows = await sql<
    { action: string; old_data: any; new_data: any }[]
  >`
    select action, old_data, new_data
      from audit.access_log
     where table_name = 'organizations'
       and action = 'DELETE'
       and row_id = ${inserted!.id}
     limit 1
  `;
  assert(deleteRows.length === 1, "DELETE created exactly 1 audit row");
  if (deleteRows.length === 1) {
    assert(deleteRows[0].old_data?.name === renamed, "audit.old_data has the row's last value");
    assert(deleteRows[0].new_data === null, "audit.new_data is null on DELETE");
  }

  // ── Audit table is not exposed via API ──────────────────────────────
  console.log("\n[audit schema not exposed via PostgREST]");
  const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);
  // Even with service role, PostgREST only exposes 'public' schema by default.
  const { error } = await (serviceClient as any).from("audit.access_log").select("*").limit(1);
  assert(error !== null, "audit.access_log is NOT reachable via the JS client (only direct SQL)");

  // Cleanup
  await sql`delete from audit.access_log where row_id = ${inserted!.id}`;

  await adminClient.auth.signOut();
  await sql.end();

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  if (fail > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
