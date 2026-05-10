/**
 * Module 4 — Realtime integration test.
 *
 * Verifies:
 *   - Postgres CDC events fire for INSERT / UPDATE / DELETE on tables in
 *     the supabase_realtime publication
 *   - RLS is enforced on the realtime stream (non-admin clients receive
 *     no events for rows they can't see)
 *
 * Run:
 *   npx tsx --env-file=.env.local tests/realtime/realtime.integration.ts
 */

import {
  createClient,
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Missing env vars. Run with: npx tsx --env-file=.env.local …");
  process.exit(1);
}

const SUBSCRIBE_TIMEOUT_MS = 5000;
const EVENT_WAIT_MS = 3000;

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

const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Wait for a channel to reach SUBSCRIBED state, or reject on timeout.
function waitForSubscribed(channel: RealtimeChannel, label: string) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label}: subscribe timeout after ${SUBSCRIBE_TIMEOUT_MS}ms`)),
      SUBSCRIBE_TIMEOUT_MS,
    );
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(t);
        reject(new Error(`${label}: subscribe ended with status ${status}`));
      }
    });
  });
}

// Subscribe, run an action that should produce an event, return the captured event (or null).
async function captureEvent(
  client: SupabaseClient,
  channelName: string,
  filter: { event: "INSERT" | "UPDATE" | "DELETE"; schema: string; table: string },
  action: () => Promise<unknown>,
): Promise<{ event: any | null; channel: RealtimeChannel }> {
  let captured: any = null;
  const channel = client.channel(channelName).on(
    "postgres_changes",
    filter,
    (payload) => {
      captured = payload;
    },
  );

  await waitForSubscribed(channel, channelName);
  // Postgres-changes streams need a short post-SUBSCRIBED warmup before the
  // first event can fire (replication slot wiring). 500ms is reliable.
  await new Promise((r) => setTimeout(r, 500));
  await action();

  // Wait for event to land (or not)
  const start = Date.now();
  while (!captured && Date.now() - start < EVENT_WAIT_MS) {
    await new Promise((r) => setTimeout(r, 100));
  }
  return { event: captured, channel };
}

async function testAdminReceivesInsertEvent() {
  console.log("\n[admin: INSERT event]");
  const client = freshClient();
  await client.auth.signInWithPassword({ email: "admin@sunset.dev", password: "admin123" });

  const orgName = `_test_realtime_insert_${Date.now()}`;

  const { event, channel } = await captureEvent(
    client,
    "rt-admin-insert",
    { event: "INSERT", schema: "public", table: "organizations" },
    async () => {
      await serviceClient.from("organizations").insert({ name: orgName });
    },
  );

  assert(event !== null, "INSERT event received by admin");
  assert(event?.eventType === "INSERT", `event type is INSERT (got ${event?.eventType})`);
  assert(event?.new?.name === orgName, `event payload name matches (${event?.new?.name})`);

  await client.removeChannel(channel);
  await client.auth.signOut();
}

async function testAdminReceivesUpdateEvent() {
  console.log("\n[admin: UPDATE event]");
  const client = freshClient();
  await client.auth.signInWithPassword({ email: "admin@sunset.dev", password: "admin123" });

  const orgName = `_test_realtime_update_${Date.now()}`;
  const { data: inserted } = await serviceClient
    .from("organizations")
    .insert({ name: orgName })
    .select()
    .single();

  const { event, channel } = await captureEvent(
    client,
    "rt-admin-update",
    { event: "UPDATE", schema: "public", table: "organizations" },
    async () => {
      await serviceClient
        .from("organizations")
        .update({ name: orgName + "_renamed" })
        .eq("id", inserted!.id);
    },
  );

  assert(event !== null, "UPDATE event received by admin");
  assert(event?.eventType === "UPDATE", `event type is UPDATE (got ${event?.eventType})`);
  assert(
    event?.new?.name === orgName + "_renamed",
    `event payload reflects renamed value (${event?.new?.name})`,
  );

  await client.removeChannel(channel);
  await client.auth.signOut();
}

async function testAdminReceivesDeleteEvent() {
  console.log("\n[admin: DELETE event]");
  const client = freshClient();
  await client.auth.signInWithPassword({ email: "admin@sunset.dev", password: "admin123" });

  const orgName = `_test_realtime_delete_${Date.now()}`;
  const { data: inserted } = await serviceClient
    .from("organizations")
    .insert({ name: orgName })
    .select()
    .single();

  const { event, channel } = await captureEvent(
    client,
    "rt-admin-delete",
    { event: "DELETE", schema: "public", table: "organizations" },
    async () => {
      await serviceClient.from("organizations").delete().eq("id", inserted!.id);
    },
  );

  assert(event !== null, "DELETE event received by admin");
  assert(event?.eventType === "DELETE", `event type is DELETE (got ${event?.eventType})`);

  await client.removeChannel(channel);
  await client.auth.signOut();
}

async function testNonAdminDoesNotReceiveEvent() {
  console.log("\n[clinician: should NOT receive event — RLS blocks]");
  const client = freshClient();
  await client.auth.signInWithPassword({ email: "nurse@sunset.dev", password: "nurse123" });

  const orgName = `_test_realtime_blocked_${Date.now()}`;

  const { event, channel } = await captureEvent(
    client,
    "rt-nurse-insert",
    { event: "INSERT", schema: "public", table: "organizations" },
    async () => {
      await serviceClient.from("organizations").insert({ name: orgName });
    },
  );

  assert(event === null, "clinician received NO event (RLS enforced on realtime stream)");

  await client.removeChannel(channel);
  await client.auth.signOut();
}

async function testAnonDoesNotReceiveEvent() {
  console.log("\n[anon: should NOT receive event — no auth]");
  const client = freshClient();

  const orgName = `_test_realtime_anon_${Date.now()}`;

  const { event, channel } = await captureEvent(
    client,
    "rt-anon-insert",
    { event: "INSERT", schema: "public", table: "organizations" },
    async () => {
      await serviceClient.from("organizations").insert({ name: orgName });
    },
  );

  assert(event === null, "anon received NO event (no JWT, RLS denies)");

  await client.removeChannel(channel);
}

async function cleanup() {
  await serviceClient.from("organizations").delete().like("name", "_test_realtime_%");
}

async function main() {
  console.log("=== Module 4: Realtime integration tests ===");
  try {
    await testAdminReceivesInsertEvent();
    await testAdminReceivesUpdateEvent();
    await testAdminReceivesDeleteEvent();
    await testNonAdminDoesNotReceiveEvent();
    await testAnonDoesNotReceiveEvent();
  } finally {
    await cleanup();
  }

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
