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
begin
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
    coalesce(NEW.organization_id, OLD.organization_id)
  );
  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

-- patient_notes: log creation
create trigger audit_patient_notes_insert
  after insert on public.patient_notes
  for each row execute function audit.log_change('note.created');

-- patients: log creation and modification
create trigger audit_patients_insert
  after insert on public.patients
  for each row execute function audit.log_change('patient.created');

create trigger audit_patients_update
  after update on public.patients
  for each row execute function audit.log_change('patient.updated');

-- relatives: log addition and removal
create trigger audit_relatives_insert
  after insert on public.relatives
  for each row execute function audit.log_change('relative.added');

create trigger audit_relatives_delete
  after delete on public.relatives
  for each row execute function audit.log_change('relative.removed');

-- practitioners: log addition
create trigger audit_practitioners_insert
  after insert on public.practitioners
  for each row execute function audit.log_change('practitioner.added');
