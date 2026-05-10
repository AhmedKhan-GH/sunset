# Audit Logging Plan

## What to log

Only log **clinically significant actions** — events that a compliance officer or administrator would need to review. Not every SELECT or timestamp update.

### Logged events

| Event | Table | Trigger |
|-------|-------|---------|
| Note created | `patient_notes` | INSERT |
| Patient record created | `patients` | INSERT |
| Patient record modified | `patients` | UPDATE |
| Relative added/removed | `relatives` | INSERT, DELETE |
| Practitioner added | `practitioners` | INSERT |
| System prompt changed | `organizations` | UPDATE (system_prompt column) |
| User login | — | Supabase auth hook (future) |

### NOT logged

- SELECT queries (too high volume, use RLS + Supabase logs for read access)
- Note searches (ephemeral, no state change)
- Message/conversation activity (chat is already persisted in `messages` table)
- Timestamp-only updates

---

## Schema

```sql
create schema if not exists audit;

create table audit.log (
  id          bigint generated always as identity primary key,
  timestamp   timestamptz not null default now(),
  actor_id    uuid not null,         -- auth.uid() of who did it
  action      text not null,         -- 'note.created', 'patient.created', etc.
  table_name  text not null,         -- 'patient_notes', 'patients', etc.
  record_id   uuid,                  -- PK of the affected row
  metadata    jsonb,                 -- additional context (old values on update, etc.)
  organization_id uuid not null      -- scoping for multi-tenant queries
);

create index audit_log_org_time_idx on audit.log (organization_id, timestamp desc);
create index audit_log_actor_idx on audit.log (actor_id, timestamp desc);
```

---

## How it captures who/what/when

| Question | Answer |
|----------|--------|
| **Who** | `actor_id` = `auth.uid()` captured via trigger `current_setting('request.jwt.claims')` or passed from the application |
| **What** | `action` (human-readable event name) + `table_name` + `record_id` + `metadata` (JSON with relevant details) |
| **When** | `timestamp` (server-side `now()`, not client-provided) |
| **Which org** | `organization_id` copied from the affected row |

---

## Implementation approach: Database triggers

A PostgreSQL `AFTER INSERT / UPDATE / DELETE` trigger on each logged table. The trigger function extracts `auth.uid()` (available in Supabase RLS context) and inserts into `audit.log`.

```sql
create or replace function audit.log_change() returns trigger as $$
begin
  insert into audit.log (actor_id, action, table_name, record_id, metadata, organization_id)
  values (
    auth.uid(),
    TG_ARGV[0],                           -- e.g. 'note.created'
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
```

Attach to tables:
```sql
create trigger audit_patient_notes after insert on public.patient_notes
  for each row execute function audit.log_change('note.created');

create trigger audit_patients_insert after insert on public.patients
  for each row execute function audit.log_change('patient.created');

create trigger audit_patients_update after update on public.patients
  for each row execute function audit.log_change('patient.updated');

create trigger audit_relatives_insert after insert on public.relatives
  for each row execute function audit.log_change('relative.added');

create trigger audit_relatives_delete after delete on public.relatives
  for each row execute function audit.log_change('relative.removed');

create trigger audit_practitioners_insert after insert on public.practitioners
  for each row execute function audit.log_change('practitioner.added');
```

---

## Access control

- `audit.log` has **no RLS** — it's in a separate schema, not exposed via PostgREST
- Only accessible via direct SQL (admin client / server actions)
- Platform admins and organization admins can view logs for their org via a server action
- Append-only: no UPDATE or DELETE policies, no application-level delete

---

## Querying (for a future admin UI)

```sql
-- Recent activity for an organization
SELECT * FROM audit.log
WHERE organization_id = $1
ORDER BY timestamp DESC
LIMIT 50;

-- What did a specific user do?
SELECT * FROM audit.log
WHERE actor_id = $1
ORDER BY timestamp DESC
LIMIT 50;

-- All note creation events for a patient
SELECT * FROM audit.log
WHERE table_name = 'patient_notes'
  AND (metadata->>'patient_id') = $1
ORDER BY timestamp DESC;
```

---

## Why this level is right

- **Not too noisy**: Only state-changing clinical events, not reads or searches
- **Not too sparse**: Captures every mutation to PHI (Protected Health Information)
- **Append-only**: Can't be tampered with by application code
- **Trigger-based**: Works regardless of whether the mutation comes from the app, the LLM tools, or direct SQL — everything goes through the same trigger
- **Scoped**: Organization-level partitioning keeps queries fast and multi-tenant safe
