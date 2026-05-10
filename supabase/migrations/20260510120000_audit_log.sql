-- Module 13: audit log
-- Append-only log of every change to audited tables. HIPAA requires retaining
-- access/modification records for PHI; this is the substrate.

create schema if not exists audit;

create table if not exists audit.access_log (
  id          bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid,
  actor_role  text,
  action      text not null,        -- 'INSERT' | 'UPDATE' | 'DELETE'
  table_name  text not null,
  row_id      text,
  old_data    jsonb,
  new_data    jsonb
);

create index if not exists access_log_table_time
  on audit.access_log (table_name, occurred_at desc);
create index if not exists access_log_actor
  on audit.access_log (actor_id, occurred_at desc);

-- Belt and suspenders: keep this schema out of any API path.
revoke all on schema audit from public;
revoke all on all tables in schema audit from public;

-- Generic trigger function. Captures who, when, what row, before/after data.
create or replace function audit.log_change() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_role  text;
  v_row_id text;
begin
  begin
    v_actor := auth.uid();
  exception when others then
    v_actor := null;
  end;

  v_role := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json->>'role',
    current_user
  );

  v_row_id := case
    when TG_OP = 'DELETE' then (to_jsonb(OLD) ->> 'id')
    else (to_jsonb(NEW) ->> 'id')
  end;

  insert into audit.access_log (
    actor_id, actor_role, action, table_name, row_id, old_data, new_data
  ) values (
    v_actor,
    v_role,
    TG_OP,
    TG_TABLE_NAME,
    v_row_id,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(OLD) end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(NEW) end
  );

  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

-- Attach to existing tables. To audit a new table later:
--   create trigger audit_log
--     after insert or update or delete on public.<table>
--     for each row execute function audit.log_change();
drop trigger if exists audit_log on public.organizations;
create trigger audit_log
  after insert or update or delete on public.organizations
  for each row execute function audit.log_change();

drop trigger if exists audit_log on public.profiles;
create trigger audit_log
  after insert or update or delete on public.profiles
  for each row execute function audit.log_change();
