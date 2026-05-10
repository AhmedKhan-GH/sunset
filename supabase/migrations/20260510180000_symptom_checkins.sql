-- Scheduled symptom check-ins
--
-- pg_cron generates a pending check-in per portal-enabled patient twice a
-- day. Patients fill it out (8 symptom scales 0-10 + free-text notes) and
-- the row flips to status='completed'. Practitioners see the org-wide feed
-- live via realtime CDC.

create table public.symptom_checkins (
  id                          uuid primary key default gen_random_uuid(),
  patient_id                  uuid not null references public.patients(id) on delete cascade,
  organization_id             uuid not null references public.organizations(id) on delete cascade,
  scheduled_at                timestamptz not null,
  scheduled_kind              text not null check (scheduled_kind in ('morning','evening','manual')),
  status                      text not null default 'pending' check (status in ('pending','completed','skipped')),
  completed_at                timestamptz,
  pain_score                  int check (pain_score between 0 and 10),
  nausea_score                int check (nausea_score between 0 and 10),
  shortness_of_breath_score   int check (shortness_of_breath_score between 0 and 10),
  anxiety_score               int check (anxiety_score between 0 and 10),
  fatigue_score               int check (fatigue_score between 0 and 10),
  appetite_score              int check (appetite_score between 0 and 10),
  mood_score                  int check (mood_score between 0 and 10),
  sleep_score                 int check (sleep_score between 0 and 10),
  notes                       text,
  created_at                  timestamptz not null default now()
);

create index symptom_checkins_patient_time_idx
  on public.symptom_checkins (patient_id, scheduled_at desc);
create index symptom_checkins_org_completed_idx
  on public.symptom_checkins (organization_id, completed_at desc) where status = 'completed';
create index symptom_checkins_pending_idx
  on public.symptom_checkins (patient_id) where status = 'pending';

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.symptom_checkins enable row level security;

-- Patient: read + update own check-ins (used to fill them out)
create policy "patient reads own checkins"
  on public.symptom_checkins
  for select
  to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid()));

create policy "patient updates own checkins"
  on public.symptom_checkins
  for update
  to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid()))
  with check (patient_id in (select id from public.patients where user_id = auth.uid()));

-- Relative: read linked patient's check-ins
create policy "relative reads linked patient checkins"
  on public.symptom_checkins
  for select
  to authenticated
  using (patient_id in (select patient_id from public.relatives where user_id = auth.uid()));

-- Practitioner / org admin: read all in their org
create policy "org staff reads org checkins"
  on public.symptom_checkins
  for select
  to authenticated
  using (
    (select role from public.profiles where user_id = auth.uid()) in ('practitioner','organization_admin')
    and organization_id = (select organization_id from public.profiles where user_id = auth.uid())
  );

-- Practitioner / org admin: insert manual check-ins for patients in their org
create policy "org staff inserts manual checkins"
  on public.symptom_checkins
  for insert
  to authenticated
  with check (
    (select role from public.profiles where user_id = auth.uid()) in ('practitioner','organization_admin')
    and organization_id = (select organization_id from public.profiles where user_id = auth.uid())
  );

-- Platform admin: full access
create policy "platform admin manages checkins"
  on public.symptom_checkins
  for all
  to authenticated
  using ((select role from public.profiles where user_id = auth.uid()) = 'platform_admin')
  with check ((select role from public.profiles where user_id = auth.uid()) = 'platform_admin');

-- ── Realtime publication ─────────────────────────────────────────────────
alter publication supabase_realtime add table public.symptom_checkins;

-- ── Audit triggers (uses audit.log_change from migration 130000) ─────────
drop trigger if exists audit_checkin_created on public.symptom_checkins;
create trigger audit_checkin_created
  after insert on public.symptom_checkins
  for each row execute function audit.log_change('checkin.created');

drop trigger if exists audit_checkin_completed on public.symptom_checkins;
create trigger audit_checkin_completed
  after update of status on public.symptom_checkins
  for each row when (NEW.status = 'completed' and (OLD.status is distinct from 'completed'))
  execute function audit.log_change('checkin.completed');

-- ── Scheduled job: insert pending check-ins ──────────────────────────────
-- Inserts one pending check-in per patient who has a portal user_id (so they
-- can actually fill it out). Returns the count inserted.
create or replace function public.create_scheduled_checkins(p_kind text)
returns int
language plpgsql
security definer
set search_path = 'public', 'pg_catalog'
as $$
declare cnt int := 0;
begin
  if p_kind not in ('morning','evening','manual') then
    raise exception 'invalid kind: %', p_kind;
  end if;

  insert into public.symptom_checkins (patient_id, organization_id, scheduled_at, scheduled_kind, status)
  select id, organization_id, now(), p_kind, 'pending'
    from public.patients
   where user_id is not null;
  get diagnostics cnt = row_count;
  return cnt;
end;
$$;

revoke all on function public.create_scheduled_checkins(text) from public;
grant execute on function public.create_scheduled_checkins(text) to authenticated;

-- pg_cron schedules (UTC). 15:00 UTC ≈ 8 AM PDT, 03:00 UTC ≈ 8 PM PDT.
select cron.unschedule('symptom-checkin-morning')
  where exists (select 1 from cron.job where jobname = 'symptom-checkin-morning');
select cron.schedule(
  'symptom-checkin-morning',
  '0 15 * * *',
  $$select public.create_scheduled_checkins('morning')$$
);

select cron.unschedule('symptom-checkin-evening')
  where exists (select 1 from cron.job where jobname = 'symptom-checkin-evening');
select cron.schedule(
  'symptom-checkin-evening',
  '0 3 * * *',
  $$select public.create_scheduled_checkins('evening')$$
);
