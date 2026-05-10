-- Enforce: a patient can have at most ONE pending check-in at any time.
--
-- Without this, both the dispatcher cron and the manual-trigger paths can
-- accumulate multiple pending rows (e.g., morning fires, patient never fills
-- it, then evening fires → 2 pending rows for the same patient). We enforce
-- the invariant at two layers:
--
--   1. A unique partial index — the DB-level source of truth.
--   2. A redefined dispatch_scheduled_checkins() that proactively skips
--      patients who already have a pending row, so the cron path returns
--      cleanly instead of hitting a constraint violation.
--
-- The server-action layer (lib/checkins/actions.ts) does the same
-- pre-check for patient-self-start and practitioner-manual-trigger paths.
--
-- Pre-existing duplicates (if any) would block the unique-index creation,
-- so we first delete older pending duplicates per patient, keeping only
-- the most recently created pending row.

-- 1. Clean up pre-existing duplicates: keep the most-recent pending per
--    patient, delete the older pending rows.
with ranked as (
  select id,
         row_number() over (
           partition by patient_id
           order by created_at desc, id desc
         ) as rn
    from public.symptom_checkins
   where status = 'pending'
)
delete from public.symptom_checkins sc
 using ranked r
 where sc.id = r.id
   and r.rn > 1;

-- 2. Unique partial index — DB-level guarantee.
create unique index if not exists symptom_checkins_one_pending_idx
  on public.symptom_checkins (patient_id) where status = 'pending';

-- 3. Replace the dispatcher so the cron path skips patients who already
--    have a pending check-in. This prevents the unique index from firing
--    in the cron's normal operation.
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
     )
     and not exists (
       select 1 from public.symptom_checkins sc
        where sc.patient_id = p.id
          and sc.status = 'pending'
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
     )
     and not exists (
       select 1 from public.symptom_checkins sc
        where sc.patient_id = p.id
          and sc.status = 'pending'
     );
  get diagnostics delta = row_count;
  inserted := inserted + delta;

  return inserted;
end;
$$;

revoke all on function public.dispatch_scheduled_checkins() from public;
