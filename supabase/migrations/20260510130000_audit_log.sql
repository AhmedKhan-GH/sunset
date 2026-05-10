-- Audit log: append-only record of clinically significant operations.
-- Only accessible via server actions (not exposed via PostgREST).

create schema if not exists audit;

create table audit.log (
  id              bigint generated always as identity primary key,
  timestamp       timestamptz not null default now(),
  actor_id        uuid not null,
  action          text not null,
  table_name      text not null,
  record_id       uuid,
  metadata        jsonb,
  organization_id uuid not null
);

create index audit_log_org_time_idx on audit.log (organization_id, timestamp desc);
create index audit_log_actor_idx on audit.log (actor_id, timestamp desc);

-- Trigger function: captures auth.uid() and inserts into audit.log.
-- TG_ARGV[0] = action name (e.g. 'note.created')
create or replace function audit.log_change() returns trigger as $$
declare
  _org_id uuid;
begin
  -- Resolve organization_id: direct column or via patient lookup
  if TG_TABLE_NAME = 'relatives' then
    select organization_id into _org_id
      from public.patients
      where id = coalesce(NEW.patient_id, OLD.patient_id);
  else
    _org_id := coalesce(NEW.organization_id, OLD.organization_id);
  end if;

  insert into audit.log (actor_id, action, table_name, record_id, metadata, organization_id)
  values (
    coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    TG_ARGV[0],
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    case
      when TG_OP = 'DELETE' then jsonb_build_object('deleted', row_to_json(OLD))
      when TG_OP = 'UPDATE' then jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
      else null
    end,
    _org_id
  );
  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

-- Triggers are attached by the seed script after Drizzle migrations
-- create the application tables.
