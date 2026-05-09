# Supabase Schema — Sunset Hospice Care (FHIR R4)

Follows [FHIR R4](https://hl7.org/fhir/R4/) resource structure for Patient, Practitioner, and Organization.
Run in Supabase SQL editor in order.

## Extensions

```sql
create extension if not exists vector;
```

## Tables

### organization

Maps to FHIR [Organization](https://hl7.org/fhir/R4/organization.html).

```sql
create table organization (
  id         uuid primary key default gen_random_uuid(),
  identifier text not null unique,        -- NPI or tax ID
  name       text not null,
  type       text not null default 'hos', -- HL7 v3 OrganizationType: hos=hospital, prov=provider, etc.
  active     boolean not null default true,
  created_at bigint not null default extract(epoch from now())::bigint
);
```

### practitioner

Maps to FHIR [Practitioner](https://hl7.org/fhir/R4/practitioner.html).

```sql
create table practitioner (
  id              uuid primary key default gen_random_uuid(),
  identifier      text not null unique,  -- NPI number
  family_name     text not null,
  given_name      text not null,
  qualification   text,                  -- e.g. MD, DO, NP, RN
  organization_id uuid references organization(id) on delete set null,
  active          boolean not null default true,
  created_at      bigint not null default extract(epoch from now())::bigint
);
```

### patient

Maps to FHIR [Patient](https://hl7.org/fhir/R4/patient.html).

```sql
create table patient (
  id                    uuid primary key default gen_random_uuid(),
  identifier            text not null unique,  -- MRN (Medical Record Number)
  family_name           text not null,
  given_name            text not null,
  birth_date            date not null,
  gender                text not null check (gender in ('male', 'female', 'other', 'unknown')),
  managing_organization uuid references organization(id) on delete set null,
  general_practitioner  uuid references practitioner(id) on delete set null,
  active                boolean not null default true,
  deceased_at           bigint,                -- unix epoch; null = alive
  created_at            bigint not null default extract(epoch from now())::bigint
);
```

### clinical_impression

Maps to FHIR [ClinicalImpression](https://hl7.org/fhir/R4/clinicalimpression.html).
Stores free-text clinical notes with embeddings for RAG semantic search.

```sql
create table clinical_impression (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references patient(id) on delete cascade,
  assessor_id      uuid references practitioner(id) on delete set null,
  status           text not null default 'completed'
                     check (status in ('in-progress', 'completed', 'entered-in-error')),
  description      text not null,   -- free-text clinical note
  embedding        vector(768),     -- insert-time embedding for RAG
  effective_at     bigint not null default extract(epoch from now())::bigint,
  created_at       bigint not null default extract(epoch from now())::bigint
);

create index on clinical_impression
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

## Row-Level Security

```sql
alter table organization         enable row level security;
alter table practitioner         enable row level security;
alter table patient              enable row level security;
alter table clinical_impression  enable row level security;
```

## Helper: semantic search on clinical impressions

```sql
create or replace function search_impressions(
  query_embedding vector(768),
  match_count     int default 5
)
returns table (
  id          uuid,
  patient_id  uuid,
  assessor_id uuid,
  description text,
  similarity  float
)
language sql stable as $$
  select
    id,
    patient_id,
    assessor_id,
    description,
    1 - (embedding <=> query_embedding) as similarity
  from clinical_impression
  order by embedding <=> query_embedding
  limit match_count;
$$;
```
