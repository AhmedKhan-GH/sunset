# Module 13 — Logs / audit

**Date:** 2026-05-09
**Status:** ✅ Done & verified

**Migration:** `supabase/migrations/20260510120000_audit_log.sql`
**Tests:** `tests/audit/audit.integration.ts` — 11 assertions, all passing

## What it does
Adds an append-only `audit.access_log` table plus a generic trigger function (`audit.log_change`) that records every INSERT / UPDATE / DELETE on tables it's attached to. Captures: who (actor_id), when, what action, what row, and full before/after JSON.

Triggers are attached to the existing `public.organizations` and `public.profiles` tables. To audit a new table later, one line:

```sql
create trigger audit_log
  after insert or update or delete on public.<table_name>
  for each row execute function audit.log_change();
```

## Why we need it
HIPAA requires a **6-year retention** of access/modification records for PHI. This is the substrate. When Chris's PHI tables (`patients`, `clinical_impressions`, `symptom_events`, `utterances`) land, they each get the trigger above and audit history starts immediately.

It's also operationally useful: "who changed this row, and when?" is a question that comes up constantly in clinical software.

## Schema

```
audit.access_log
├── id           bigserial PK
├── occurred_at  timestamptz   (default now())
├── actor_id     uuid          (auth.uid() — null for non-JWT writes)
├── actor_role   text          (JWT role claim or db role)
├── action       text          ('INSERT' | 'UPDATE' | 'DELETE')
├── table_name   text
├── row_id       text          (the row's id column, as text)
├── old_data     jsonb         (full row before change; null on INSERT)
└── new_data     jsonb         (full row after change; null on DELETE)
```

Two indexes for the common queries:
- `(table_name, occurred_at desc)` — "show me all changes to X table"
- `(actor_id, occurred_at desc)` — "show me all changes user X made"

## Security

- The `audit` schema is **not in PostgREST's exposed schemas** — it can't be queried via the JS client even with service role. Only direct Postgres connections (postgres-js, psql) can read it.
- `revoke all on schema audit from public` on top, belt-and-suspenders.
- The trigger function is `security definer` and `set search_path = ''` to prevent search-path attacks.

## How attribution works
- When a user makes a change through the JS client → JWT travels with the request → PostgREST sets `request.jwt.claims` on the connection → `auth.uid()` returns the user's UUID → trigger records it as `actor_id`.
- When a write happens through Drizzle / direct postgres-js (no JWT) → `auth.uid()` returns null → audit row has `actor_id = null` and `actor_role = 'postgres'`.

This means **changes made by the platform-admin org-creation form on `/admin` show `actor_id = null`** because Ahmed's server action uses Drizzle's superuser connection. To get real attribution there, server actions would need to use the user-scoped client (`@/lib/supabase/server`) instead of Drizzle for writes. Worth flagging to Ahmed.

## What was verified

11 assertions covering:
- **INSERT** through user-scoped JS client → 1 audit row, correct `actor_id`, correct action, `new_data.name` matches
- **UPDATE** → audit row with `old_data` (previous value) and `new_data` (new value)
- **DELETE** → audit row with `old_data` populated and `new_data = null`
- **Audit schema is not reachable via the JS client** — confirms PostgREST isolation is working

## How to re-run the test
```bash
npx tsx --env-file=.env.local tests/audit/audit.integration.ts
```

## Useful queries

```sql
-- Recent changes to a table
select occurred_at, action, actor_id, row_id, new_data
  from audit.access_log
 where table_name = 'organizations'
 order by occurred_at desc
 limit 20;

-- Everything one user has touched
select occurred_at, table_name, action, row_id
  from audit.access_log
 where actor_id = '<uuid>'
 order by occurred_at desc;

-- Untracked changes (no actor — service role / direct DB writes)
select * from audit.access_log where actor_id is null limit 50;
```

## Gotchas worth knowing
- **Audit rows are inside the same transaction as the change.** If the change rolls back, the audit row rolls back too. That's correct behavior — you don't want phantom audit entries — but it means a failed write produces no record.
- **Triggers add ~0.5–2 ms per write.** Negligible for clinical data, but don't audit high-throughput tables (e.g., metrics, telemetry) without thinking.
- **Drizzle writes have null `actor_id`.** Anything going through `lib/db/index.ts` is the postgres superuser. To get real attribution, switch the server-action write to the user-scoped Supabase client.
- **Retention is your job.** Postgres won't auto-delete old audit rows. For HIPAA's 6-year requirement, set up a `pg_cron` job that archives older rows to cold storage and then deletes them, or rely on log drains.
- **Audit table is unbounded.** Plan for it to grow large. Partitioning by month is a sensible escalation if it gets to 100M+ rows.
