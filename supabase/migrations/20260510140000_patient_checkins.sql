-- Patient check-in scheduler
-- Morning (15:00 UTC = 8 AM PDT) and evening (03:00 UTC = 8 PM PDT) jobs
-- generate one check-in row per demo patient by sampling symptom_demo.
-- When Chris's patients table lands, swap the hardcoded list for a query.

create table if not exists public.patient_checkins (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null,
  patient_name     text not null,
  checkin_type     text not null check (checkin_type in ('morning', 'evening')),
  symptom_category text,
  symptom_text     text not null,
  created_at       timestamptz not null default now()
);

create index if not exists patient_checkins_recent_idx
  on public.patient_checkins (created_at desc);
create index if not exists patient_checkins_patient_idx
  on public.patient_checkins (patient_id, created_at desc);

-- RLS: clinicians can read; nobody else.
alter table public.patient_checkins enable row level security;

drop policy if exists "clinicians can read patient_checkins" on public.patient_checkins;
create policy "clinicians can read patient_checkins"
  on public.patient_checkins
  for select
  to authenticated
  using (
    (select role from public.profiles where user_id = auth.uid()) = 'clinician'
  );

-- Publish to realtime so the clinician dashboard sees rows appear live.
alter publication supabase_realtime add table public.patient_checkins;

-- Audit-log it (uses the trigger from module 13).
drop trigger if exists audit_log on public.patient_checkins;
create trigger audit_log
  after insert or update or delete on public.patient_checkins
  for each row execute function audit.log_change();

-- Generate one check-in per demo patient. Returns the count inserted.
create or replace function public.generate_patient_checkins(p_checkin_type text)
returns int
language plpgsql
security definer
set search_path = 'public', 'pg_catalog'
as $$
declare
  patients constant jsonb[] := array[
    jsonb_build_object('id', '00000000-0000-0000-0000-000000000001'::uuid, 'name', 'Mrs. Brown'),
    jsonb_build_object('id', '00000000-0000-0000-0000-000000000002'::uuid, 'name', 'Mr. Davis'),
    jsonb_build_object('id', '00000000-0000-0000-0000-000000000003'::uuid, 'name', 'Mrs. Liu'),
    jsonb_build_object('id', '00000000-0000-0000-0000-000000000004'::uuid, 'name', 'Mr. Patel')
  ];
  p jsonb;
  s record;
  inserted int := 0;
begin
  if p_checkin_type not in ('morning', 'evening') then
    raise exception 'invalid checkin_type: %', p_checkin_type;
  end if;

  foreach p in array patients loop
    select category, symptom_text into s
      from public.symptom_demo
      order by random()
      limit 1;

    insert into public.patient_checkins (
      patient_id, patient_name, checkin_type, symptom_category, symptom_text
    ) values (
      (p->>'id')::uuid,
      p->>'name',
      p_checkin_type,
      s.category,
      s.symptom_text
    );
    inserted := inserted + 1;
  end loop;

  return inserted;
end;
$$;

-- Allow authenticated clinicians to trigger a check-in for the demo.
revoke all on function public.generate_patient_checkins(text) from public;
grant execute on function public.generate_patient_checkins(text) to authenticated;

-- Schedule morning (15:00 UTC = 8 AM PDT)
select cron.unschedule('morning-checkin')
  where exists (select 1 from cron.job where jobname = 'morning-checkin');
select cron.schedule(
  'morning-checkin',
  '0 15 * * *',
  $$select public.generate_patient_checkins('morning')$$
);

-- Schedule evening (03:00 UTC = 8 PM PDT)
select cron.unschedule('evening-checkin')
  where exists (select 1 from cron.job where jobname = 'evening-checkin');
select cron.schedule(
  'evening-checkin',
  '0 3 * * *',
  $$select public.generate_patient_checkins('evening')$$
);
