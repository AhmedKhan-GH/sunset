-- Module 2 — RLS rigorous tests on existing tables (profiles, organizations).
-- Idempotent and self-cleaning. Run with:
--   psql "$DATABASE_URL" -f tests/db/02_rls.test.sql

\set ON_ERROR_STOP on
\echo '=== Module 2: RLS ==='

-- Stable test UUIDs
\set admin_uuid '11111111-1111-1111-1111-111111111111'
\set user_uuid  '22222222-2222-2222-2222-222222222222'
\set ghost_uuid '99999999-9999-9999-9999-999999999999'

-- Cleanup any prior test artifacts (as superuser, bypasses RLS)
delete from public.profiles where user_id in (:'admin_uuid', :'user_uuid');
delete from public.organizations where name like '_test_org_%';

-- Insert fixtures (as superuser, bypasses RLS)
insert into public.profiles (user_id, role) values
  (:'admin_uuid', 'platform_admin'),
  (:'user_uuid',  'clinician');
insert into public.organizations (name) values ('_test_org_seed');

-- ───────────────────────────────────────────────────────────────────────
-- Test 1: RLS is enabled on both tables
-- ───────────────────────────────────────────────────────────────────────
do $$
declare p_rls bool; o_rls bool;
begin
  select relrowsecurity into p_rls from pg_class
    where relname = 'profiles' and relnamespace = 'public'::regnamespace;
  select relrowsecurity into o_rls from pg_class
    where relname = 'organizations' and relnamespace = 'public'::regnamespace;
  if not p_rls then raise exception 'FAIL: RLS not enabled on profiles'; end if;
  if not o_rls then raise exception 'FAIL: RLS not enabled on organizations'; end if;
  raise notice 'PASS: RLS enabled on profiles and organizations';
end $$;

-- ───────────────────────────────────────────────────────────────────────
-- Test 2: anon cannot read profiles
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role anon;
  do $$
  declare cnt int;
  begin
    select count(*) into cnt from public.profiles;
    if cnt > 0 then raise exception 'FAIL: anon saw % profiles, expected 0', cnt; end if;
    raise notice 'PASS: anon cannot read profiles';
  end $$;
rollback;

-- ───────────────────────────────────────────────────────────────────────
-- Test 3: anon cannot read organizations
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role anon;
  do $$
  declare cnt int;
  begin
    select count(*) into cnt from public.organizations;
    if cnt > 0 then raise exception 'FAIL: anon saw % orgs, expected 0', cnt; end if;
    raise notice 'PASS: anon cannot read organizations';
  end $$;
rollback;

-- ───────────────────────────────────────────────────────────────────────
-- Test 4: anon cannot insert organizations
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role anon;
  do $$
  begin
    begin
      insert into public.organizations (name) values ('_test_org_anon_attempt');
      raise exception 'FAIL: anon insert into organizations succeeded';
    exception when others then
      if SQLERRM like 'FAIL%' then raise; end if;
      raise notice 'PASS: anon insert rejected (%)', SQLERRM;
    end;
  end $$;
rollback;

-- ───────────────────────────────────────────────────────────────────────
-- Test 5: authenticated user with NO profile cannot read organizations
--         (subquery in org policy returns null, so policy fails)
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
  do $$
  declare cnt int;
  begin
    select count(*) into cnt from public.organizations;
    if cnt > 0 then raise exception 'FAIL: profile-less user saw % orgs', cnt; end if;
    raise notice 'PASS: authenticated user with no profile cannot read organizations';
  end $$;
rollback;

-- ───────────────────────────────────────────────────────────────────────
-- Test 6: authenticated platform_admin CAN read organizations
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
  do $$
  declare cnt int;
  begin
    select count(*) into cnt from public.organizations where name = '_test_org_seed';
    if cnt < 1 then raise exception 'FAIL: platform_admin could not read seeded org (cnt=%)', cnt; end if;
    raise notice 'PASS: platform_admin can read organizations';
  end $$;
rollback;

-- ───────────────────────────────────────────────────────────────────────
-- Test 7: authenticated platform_admin CAN insert organization
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
  do $$
  declare cnt int;
  begin
    insert into public.organizations (name) values ('_test_org_admin_insert');
    select count(*) into cnt from public.organizations where name = '_test_org_admin_insert';
    if cnt <> 1 then raise exception 'FAIL: insert succeeded but row not visible'; end if;
    raise notice 'PASS: platform_admin can insert into organizations';
  end $$;
rollback;

-- ───────────────────────────────────────────────────────────────────────
-- Test 8: authenticated non-admin (clinician role) CANNOT read organizations
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
  do $$
  declare cnt int;
  begin
    select count(*) into cnt from public.organizations;
    if cnt > 0 then raise exception 'FAIL: clinician saw % orgs', cnt; end if;
    raise notice 'PASS: clinician (non-admin) cannot read organizations';
  end $$;
rollback;

-- ───────────────────────────────────────────────────────────────────────
-- Test 9: authenticated non-admin CANNOT insert organization
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
  do $$
  begin
    begin
      insert into public.organizations (name) values ('_test_org_clinician_attempt');
      raise exception 'FAIL: clinician insert into organizations succeeded';
    exception when others then
      if SQLERRM like 'FAIL%' then raise; end if;
      raise notice 'PASS: clinician insert rejected (%)', SQLERRM;
    end;
  end $$;
rollback;

-- ───────────────────────────────────────────────────────────────────────
-- Test 10: authenticated user CAN read their OWN profile
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
  do $$
  declare cnt int;
  begin
    select count(*) into cnt from public.profiles
      where user_id = '22222222-2222-2222-2222-222222222222';
    if cnt <> 1 then raise exception 'FAIL: user saw % own-profile rows', cnt; end if;
    raise notice 'PASS: user can read own profile';
  end $$;
rollback;

-- ───────────────────────────────────────────────────────────────────────
-- Test 11: authenticated user CANNOT read another user's profile
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
  do $$
  declare cnt int;
  begin
    -- Total visible profiles to this user should be exactly 1 (their own)
    select count(*) into cnt from public.profiles;
    if cnt <> 1 then
      raise exception 'FAIL: user saw % profiles total, expected only their own (1)', cnt;
    end if;
    -- Specifically the admin's profile should not be visible
    select count(*) into cnt from public.profiles
      where user_id = '11111111-1111-1111-1111-111111111111';
    if cnt > 0 then raise exception 'FAIL: user saw another user''s profile'; end if;
    raise notice 'PASS: user cannot read other users'' profiles';
  end $$;
rollback;

-- ───────────────────────────────────────────────────────────────────────
-- Test 12: service_role bypasses RLS (sees all rows)
-- ───────────────────────────────────────────────────────────────────────
begin;
  set local role service_role;
  do $$
  declare p_cnt int; o_cnt int;
  begin
    select count(*) into p_cnt from public.profiles;
    select count(*) into o_cnt from public.organizations;
    if p_cnt < 2 then raise exception 'FAIL: service_role saw % profiles, expected >=2', p_cnt; end if;
    if o_cnt < 1 then raise exception 'FAIL: service_role saw % orgs, expected >=1', o_cnt; end if;
    raise notice 'PASS: service_role bypasses RLS (sees % profiles, % orgs)', p_cnt, o_cnt;
  end $$;
rollback;

-- Cleanup
delete from public.profiles where user_id in (:'admin_uuid', :'user_uuid');
delete from public.organizations where name like '_test_org_%';
\echo 'PASS: cleanup complete'

\echo '=== Module 2: ALL TESTS PASSED ==='
