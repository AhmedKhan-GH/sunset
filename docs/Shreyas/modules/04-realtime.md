# Module 4 — Realtime

**Date:** 2026-05-09
**Status:** ✅ Done & verified

**Migration:** `supabase/migrations/20260509130001_add_organizations_to_realtime.sql`
**Tests:** `tests/realtime/realtime.integration.ts` — 10 assertions, all passing

## What it does
Adds `public.organizations` to the `supabase_realtime` publication so Postgres CDC events fire on every INSERT / UPDATE / DELETE.

## Why this was needed
Supabase Realtime's container was already running and the `supabase_realtime` publication existed, but **zero tables had been added to it** — meaning no change events fired for anything. Realtime was "running" but useless until tables opt in.

## What was verified
**10 programmatic assertions:**
- Admin client receives INSERT events (with full row payload)
- Admin client receives UPDATE events (old + new values)
- Admin client receives DELETE events
- Clinician client receives **no** events for orgs (RLS denies — proves the realtime stream enforces RLS, not just direct queries)
- Anonymous client receives **no** events (no JWT)

## Pattern for adding new tables (Chris)
When new tables (`patients`, `clinical_impressions`, `symptom_events`, `utterances`, etc.) land, add each to the publication:

```sql
alter publication supabase_realtime add table public.<table_name>;
```

Realtime will then enforce whatever RLS policies the table has — make sure those exist before publishing.

## Gotchas worth knowing
- **First-subscribe cold start.** After `.subscribe()` reports `SUBSCRIBED`, allow ~500ms before triggering the first event — the replication slot needs warmup time. Subsequent events fire immediately.
- **RLS via JWT only.** Realtime evaluates RLS using the JWT attached to the connection at subscribe time. Without a JWT (anon role), policies that depend on `auth.uid()` always return null, so anon never receives events from RLS-protected tables.
- **`Broadcast` and `Presence` channels do NOT enforce RLS.** Only `postgres_changes` does. If you broadcast PHI by accident, every subscriber sees it.

## How to re-run the test
```bash
npx tsx --env-file=.env.local tests/realtime/realtime.integration.ts
```

## Where the realtime code actually lives

| Concern | File | What it does |
|---|---|---|
| **Tells Postgres to broadcast changes for `organizations`** | `supabase/migrations/20260509130001_add_organizations_to_realtime.sql` | One line: `alter publication supabase_realtime add table public.organizations;`. Without this, no events fire for that table. |
| **The reactive UI demo** | `app/admin/live/page.tsx` | Server component: auth check + initial org list, then renders `<LiveFeed />`. |
| **Where the actual subscription happens** | `app/admin/live/live-feed.tsx` | Client component. The block marked `// THIS IS WHAT MAKES REALTIME WORK` pulls the session and calls `supabase.realtime.setAuth(token)` before `.subscribe()` — without that, the channel connects as anon and RLS blocks events. The `.on("postgres_changes", { event: "*", ... }, handler)` is what receives INSERT/UPDATE/DELETE rows from the server. |
| **CLI watcher (terminal-side)** | `tests/realtime/watch.ts` | Same subscribe pattern as the page, signs in directly with email/password instead of relying on cookies. Useful for quickly proving events are firing without opening a browser. |
| **Programmatic test of the whole pipeline** | `tests/realtime/realtime.integration.ts` | Subscribes as each role, asserts admin gets events, clinician/anon don't. |

The two lines that turn realtime on for any table are:

```sql
-- 1. Database side (one per table)
alter publication supabase_realtime add table public.<table_name>;
```

```ts
// 2. Client side
await supabase.realtime.setAuth(session.access_token);
const channel = supabase.channel("anything")
  .on("postgres_changes", { event: "*", schema: "public", table: "<name>" }, handler)
  .subscribe();
```

That's the entire surface area.
