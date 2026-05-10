-- The original RLS on symptom_checkins (migration ...180000) added an
-- INSERT policy for practitioner / organization_admin (manual triggers)
-- and platform_admin, but not for patients themselves. The "Start a
-- check-in" button on /patient/checkins fails because the user-scoped
-- supabase client respects RLS and there's no policy that lets a patient
-- insert into their own row.
--
-- Adds: patient may INSERT a row only for THEIR OWN patient_id.

drop policy if exists "patient inserts own checkin" on public.symptom_checkins;
create policy "patient inserts own checkin"
  on public.symptom_checkins
  for insert
  to authenticated
  with check (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );
