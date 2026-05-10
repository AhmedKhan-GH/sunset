-- Patient-configurable scheduled check-in times.
--
-- Replaces the two fixed daily pg_cron jobs with one dispatcher that runs
-- every 15 minutes and inserts a pending check-in for any patient whose
-- preferred time falls within the current window — so each patient can
-- pick their own morning + evening times.

alter table public.patients
  add column if not exists morning_checkin_time time not null default '08:00',
  add column if not exists evening_checkin_time time not null default '20:00';

-- Dispatcher: scans patients with portal logins, inserts a pending check-in
-- when "now" matches their preferred time within a 15-minute window AND no
-- check-in of that kind has been created today.
create or replace function public.dispatch_scheduled_checkins()
returns int
language plpgsql
security definer
set search_path = 'public', 'pg_catalog'
as $$
declare
  inserted int := 0;
  delta int;
  -- Treat all preferred times as UTC for v1; the patient's UI does the
  -- local↔UTC conversion. Add a `checkin_timezone` column later for
  -- per-patient timezone support.
  now_t time := (now() at time zone 'UTC')::time;
begin
  -- Morning slot
  insert into public.symptom_checkins
    (patient_id, organization_id, scheduled_at, scheduled_kind, status)
  select p.id, p.organization_id, now(), 'morning', 'pending'
    from public.patients p
   where p.user_id is not null
     and p.morning_checkin_time <= now_t
     and p.morning_checkin_time > (now_t - interval '15 minutes')
     and not exists (
       select 1 from public.symptom_checkins sc
        where sc.patient_id = p.id
          and sc.scheduled_kind = 'morning'
          and sc.scheduled_at::date = current_date
     );
  get diagnostics delta = row_count;
  inserted := inserted + delta;

  -- Evening slot
  insert into public.symptom_checkins
    (patient_id, organization_id, scheduled_at, scheduled_kind, status)
  select p.id, p.organization_id, now(), 'evening', 'pending'
    from public.patients p
   where p.user_id is not null
     and p.evening_checkin_time <= now_t
     and p.evening_checkin_time > (now_t - interval '15 minutes')
     and not exists (
       select 1 from public.symptom_checkins sc
        where sc.patient_id = p.id
          and sc.scheduled_kind = 'evening'
          and sc.scheduled_at::date = current_date
     );
  get diagnostics delta = row_count;
  inserted := inserted + delta;

  return inserted;
end;
$$;

revoke all on function public.dispatch_scheduled_checkins() from public;

-- Replace the old fixed-time jobs with the new dispatcher.
select cron.unschedule('symptom-checkin-morning')
  where exists (select 1 from cron.job where jobname = 'symptom-checkin-morning');
select cron.unschedule('symptom-checkin-evening')
  where exists (select 1 from cron.job where jobname = 'symptom-checkin-evening');
select cron.unschedule('symptom-checkin-dispatcher')
  where exists (select 1 from cron.job where jobname = 'symptom-checkin-dispatcher');

select cron.schedule(
  'symptom-checkin-dispatcher',
  '*/15 * * * *',  -- every 15 minutes
  $$select public.dispatch_scheduled_checkins()$$
);
