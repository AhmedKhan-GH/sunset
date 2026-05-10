/**
 * Manual realtime watcher — prints every CDC event on `organizations`.
 *
 * Run:
 *   npx tsx --env-file=.env.local tests/realtime/watch.ts
 *
 * Then in another terminal or in Studio, insert/update/delete an org.
 * Each change prints here within ~1 second.
 *
 * Ctrl-C to stop.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const client = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

await client.auth.signInWithPassword({
  email: "admin@sunset.dev",
  password: "admin123",
});

console.log("✅ Signed in as admin. Subscribing to organizations…\n");

client
  .channel("watch-orgs")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "organizations" },
    (payload) => {
      const time = new Date().toLocaleTimeString();
      const row = (payload.new ?? payload.old) as { name?: string };
      console.log(
        `[${time}] ${payload.eventType.padEnd(6)} ${row?.name ?? "(unknown)"}`,
      );
    },
  )
  .subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log("👂 Listening. Insert/update/delete an org to see events.\n");
    }
  });

// Keep the process alive
process.stdin.resume();
