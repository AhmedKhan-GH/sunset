-- Patient self-report check-ups (form-driven)
-- Caregivers fill out a 6-symptom 0-10 quiz; clinicians see them live.

create table if not exists public.patient_checkups (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null,           -- auth.uid() of submitter
  patient_name               text not null,
  pain_score                 int check (pain_score between 0 and 10),
  nausea_score               int check (nausea_score between 0 and 10),
  headache_score             int check (headache_score between 0 and 10),
  fatigue_score              int check (fatigue_score between 0 and 10),
  anxiety_score              int check (anxiety_score between 0 and 10),
  shortness_of_breath_score  int check (shortness_of_breath_score between 0 and 10),
  notes                      text,
  created_at                 timestamptz not null default now()
);

create index if not exists patient_checkups_recent_idx
  on public.patient_checkups (created_at desc);
create index if not exists patient_checkups_user_idx
  on public.patient_checkups (user_id, created_at desc);

alter table public.patient_checkups enable row level security;

-- Caregivers may insert their own check-up.
drop policy if exists "caregiver inserts own checkup" on public.patient_checkups;
create policy "caregiver inserts own checkup"
  on public.patient_checkups
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (select role from public.profiles where user_id = auth.uid()) = 'caregiver'
  );

-- Users may read their own check-ups.
drop policy if exists "user reads own checkups" on public.patient_checkups;
create policy "user reads own checkups"
  on public.patient_checkups
  for select
  to authenticated
  using (user_id = auth.uid());

-- Clinicians may read all check-ups.
drop policy if exists "clinician reads all checkups" on public.patient_checkups;
create policy "clinician reads all checkups"
  on public.patient_checkups
  for select
  to authenticated
  using (
    (select role from public.profiles where user_id = auth.uid()) = 'clinician'
  );

-- Realtime + audit
alter publication supabase_realtime add table public.patient_checkups;

drop trigger if exists audit_log on public.patient_checkups;
create trigger audit_log
  after insert or update or delete on public.patient_checkups
  for each row execute function audit.log_change();
