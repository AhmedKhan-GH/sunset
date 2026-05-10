# Module 5 — pg_cron

**Date:** 2026-05-09
**Status:** ✅ Done & verified

**Migration:** `supabase/migrations/20260510004000_pg_cron_ping_demo.sql`

## What it does
Enables the `pg_cron` extension (v1.6.4) and schedules a job that fires every day at 00:40 UTC (5:40 PM PDT). The job inserts a row into a new `cron_pings` table, and that table is published to realtime so `/admin/live` shows the ping appear without a refresh.

## Why we need it
The whole "scheduled symptom follow-up" flow (`it's 8pm, how's your pain now?`) depends on jobs that run inside the database, independent of any client being connected. pg_cron is what fires those follow-ups. Without it, scheduled prompts can only happen if a user happens to be on the page — useless for a hospice app where the iPad may be locked or off-network.

## What was added

| File | What it is |
|---|---|
| `supabase/migrations/20260510004000_pg_cron_ping_demo.sql` | Enables `pg_cron`, creates `cron_pings` table with RLS, adds it to the realtime publication, schedules the `demo-ping` job |
| `app/admin/live/page.tsx` | Now also fetches initial pings server-side and passes them as props |
| `app/admin/live/live-feed.tsx` | Subscribes to `cron_pings` INSERT events and renders them in a "pg_cron pings" section at the bottom |

## End-to-end pipeline this proves

```
pg_cron (in-database scheduler)
   │  fires `demo-ping` job at 00:40 UTC
   ▼
INSERT into public.cron_pings
   │
   ▼
supabase_realtime publication picks up the change
   │
   ▼
Realtime server pushes event over WebSocket to subscribed clients
   │
   ▼
LiveFeed Client Component appends the row to React state
   │
   ▼
"PING" appears in the UI — no refresh, no polling
```

This is the same pipeline the actual product needs for scheduled symptom follow-ups.

## How to verify manually
1. Sign in as `admin@sunset.dev`
2. Open http://localhost:3000/admin/live
3. Scroll to the "pg_cron pings" section
4. Wait for 5:40 PM PDT (00:40 UTC) — a row should appear automatically with "ping from pg_cron at 5:40 PM PDT"

## Inspecting jobs from psql
```sql
-- See all scheduled jobs
select jobid, jobname, schedule, command from cron.job;

-- See past job runs
select * from cron.job_run_details order by start_time desc limit 10;

-- Add a new job
select cron.schedule('job-name', '*/5 * * * *', 'SELECT 1');

-- Remove a job
select cron.unschedule('job-name');
```

## Pattern for adding new scheduled jobs

```sql
select cron.schedule(
  'unique-job-name',
  '<cron expression in UTC>',
  $$<sql to run>$$
);
```

For the actual symptom-followup workflow, the job would scan `scheduled_followups` for rows where `due_at <= now()` and update them to `fired`, which would in turn trigger realtime events to the patient's iPad.

## Gotchas worth knowing
- **pg_cron runs in UTC by default.** `40 0 * * *` is 00:40 UTC, not 00:40 local. Convert your local time before scheduling.
- **pg_cron only checks the schedule once per minute.** A job scheduled for `40 0 * * *` may fire anywhere in the 00:40:00–00:40:59 range.
- **Jobs run as the `postgres` superuser.** They bypass RLS. Don't rely on RLS to scope scheduled work — write the SQL with explicit filters.
- **Past failures live in `cron.job_run_details`.** If a job is silently failing, that's the table to inspect.
