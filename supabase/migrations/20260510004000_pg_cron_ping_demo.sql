-- Module 5: pg_cron
-- Enables the pg_cron extension and schedules a one-shot ping at 00:40 UTC
-- (= 5:40 PM PDT) to prove pg_cron fires + propagates through realtime.

create extension if not exists pg_cron;

-- Table that scheduled jobs write into so we can see them.
create table if not exists public.cron_pings (
  id        uuid primary key default gen_random_uuid(),
  message   text not null,
  fired_at  timestamptz not null default now()
);

alter table public.cron_pings enable row level security;

drop policy if exists "authenticated can read cron_pings" on public.cron_pings;
create policy "authenticated can read cron_pings"
  on public.cron_pings
  for select
  to authenticated
  using (true);

-- Publish to realtime so /admin/live picks up new rows
alter publication supabase_realtime add table public.cron_pings;

-- Demo schedule: fire once at 00:40 UTC (5:40 PM PDT today / every day)
-- pg_cron runs in UTC. Use cron.unschedule to remove later if needed.
select cron.unschedule('demo-ping') where exists (
  select 1 from cron.job where jobname = 'demo-ping'
);
select cron.schedule(
  'demo-ping',
  '40 0 * * *',
  $$insert into public.cron_pings (message) values ('ping from pg_cron at 5:40 PM PDT')$$
);
