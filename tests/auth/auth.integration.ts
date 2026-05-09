/**
 * Module 3 — Auth integration test.
 *
 * Hits the running local Supabase. Verifies sign-in / RLS-via-JWT / sign-out
 * end-to-end across all three seeded roles (platform_admin, clinician,
 * caregiver) plus anon.
 *
 * Run:
 *   npx tsx --env-file=.env.local tests/auth/auth.integration.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Missing env vars. Run with: npx tsx --env-file=.env.local …");
  process.exit(1);
}

const USERS = {
  admin:     { email: "admin@sunset.dev",     password: "admin123",     role: "platform_admin" },
  nurse:     { email: "nurse@sunset.dev",     password: "nurse123",     role: "clinician" },
  caregiver: { email: "caregiver@sunset.dev", password: "caregiver123", role: "caregiver" },
};

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

function freshClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signIn(client: SupabaseClient, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function testAdminFlow() {
  console.log("\n[admin@sunset.dev — platform_admin]");
  const c = freshClient();

  const session = await signIn(c, USERS.admin.email, USERS.admin.password);
  assert(!!session.session?.access_token, "sign-in returns access token");
  assert(session.user?.email === USERS.admin.email, "user email matches");

  const { data: orgs, error: orgsErr } = await c
    .from("organizations")
    .select("*");
  assert(orgsErr === null, "platform_admin can SELECT organizations (no RLS error)");
  assert((orgs?.length ?? 0) >= 5, `platform_admin sees >= 5 orgs (saw ${orgs?.length ?? 0})`);

  const { data: profile } = await c
    .from("profiles")
    .select("*")
    .eq("user_id", session.user!.id)
    .single();
  assert(profile?.role === "platform_admin", "own profile shows correct role");

  const { error: insertErr } = await c
    .from("organizations")
    .insert({ name: `_test_org_${Date.now()}` });
  assert(insertErr === null, "platform_admin can INSERT organizations");

  await c.auth.signOut();
  const { data: orgsAfter } = await c.from("organizations").select("*");
  assert((orgsAfter?.length ?? 0) === 0, "after sign-out, sees 0 orgs (RLS denies anon)");
}

async function testClinicianFlow() {
  console.log("\n[nurse@sunset.dev — clinician]");
  const c = freshClient();

  const session = await signIn(c, USERS.nurse.email, USERS.nurse.password);
  assert(!!session.session?.access_token, "sign-in returns access token");

  const { data: orgs } = await c.from("organizations").select("*");
  assert((orgs?.length ?? 0) === 0, `clinician CANNOT see organizations (saw ${orgs?.length ?? 0})`);

  const { error: insertErr } = await c
    .from("organizations")
    .insert({ name: `_test_org_clinician_${Date.now()}` });
  assert(insertErr !== null, "clinician INSERT into organizations is rejected");

  const { data: profile } = await c
    .from("profiles")
    .select("*")
    .eq("user_id", session.user!.id)
    .single();
  assert(profile?.role === "clinician", "own profile shows clinician role");

  const { data: othersProfile } = await c
    .from("profiles")
    .select("*")
    .neq("user_id", session.user!.id);
  assert((othersProfile?.length ?? 0) === 0, "clinician cannot see other users' profiles");

  await c.auth.signOut();
}

async function testCaregiverFlow() {
  console.log("\n[caregiver@sunset.dev — caregiver]");
  const c = freshClient();

  const session = await signIn(c, USERS.caregiver.email, USERS.caregiver.password);
  assert(!!session.session?.access_token, "sign-in returns access token");

  const { data: orgs } = await c.from("organizations").select("*");
  assert((orgs?.length ?? 0) === 0, "caregiver CANNOT see organizations");

  const { data: profile } = await c
    .from("profiles")
    .select("*")
    .eq("user_id", session.user!.id)
    .single();
  assert(profile?.role === "caregiver", "own profile shows caregiver role");

  await c.auth.signOut();
}

async function testAnonFlow() {
  console.log("\n[anon — no session]");
  const c = freshClient();

  const { data: orgs } = await c.from("organizations").select("*");
  assert((orgs?.length ?? 0) === 0, "anon sees 0 organizations");

  const { data: profiles } = await c.from("profiles").select("*");
  assert((profiles?.length ?? 0) === 0, "anon sees 0 profiles");

  const { error: insertErr } = await c
    .from("organizations")
    .insert({ name: "_test_org_anon" });
  assert(insertErr !== null, "anon INSERT into organizations is rejected");
}

async function testWrongPassword() {
  console.log("\n[wrong password]");
  const c = freshClient();
  const { error } = await c.auth.signInWithPassword({
    email: USERS.admin.email,
    password: "wrong-password-on-purpose",
  });
  assert(error !== null, "wrong password is rejected");
  assert(
    /invalid|credentials/i.test(error?.message ?? ""),
    `error message indicates invalid creds (got: "${error?.message}")`,
  );
}

async function testSignOutClearsSession() {
  console.log("\n[sign-out clears session]");
  const c = freshClient();
  await signIn(c, USERS.admin.email, USERS.admin.password);
  const before = (await c.auth.getSession()).data.session;
  assert(before !== null, "session present after sign-in");

  await c.auth.signOut();
  const after = (await c.auth.getSession()).data.session;
  assert(after === null, "session null after sign-out");
}

async function cleanup() {
  // Remove any _test_org_* rows we created via service role
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await admin.from("organizations").delete().like("name", "_test_org_%");
}

async function main() {
  console.log("=== Module 3: Auth integration tests ===");
  try {
    await testAdminFlow();
    await testClinicianFlow();
    await testCaregiverFlow();
    await testAnonFlow();
    await testWrongPassword();
    await testSignOutClearsSession();
  } finally {
    await cleanup();
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  if (fail > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
