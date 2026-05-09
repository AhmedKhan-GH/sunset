# Supabase Schema — Sunset Hospice Care

Run in Supabase SQL editor in order.

## Extensions

```sql
create extension if not exists vector;
```

## Tables

### doctors

```sql
create table doctors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  license_id text not null unique,
  created_at bigint not null default extract(epoch from now())::bigint
);
```

### patients

```sql
create table patients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  date_of_birth date not null,
  sex           text not null check (sex in ('male', 'female', 'other')),
  doctor_id     uuid references doctors(id) on delete set null,
  created_at    bigint not null default extract(epoch from now())::bigint
);
```

### notes

Clinical notes with embeddings for RAG semantic search via pg-vector.

```sql
create table notes (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id  uuid references doctors(id) on delete set null,
  content    text not null,
  embedding  vector(768),
  created_at bigint not null default extract(epoch from now())::bigint
);

create index on notes using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

## Row-Level Security

Enable RLS on all tables — no public access.

```sql
alter table doctors  enable row level security;
alter table patients enable row level security;
alter table notes    enable row level security;
```

## Helper: semantic search on notes

```sql
create or replace function search_notes(
  query_embedding vector(768),
  match_count     int default 5
)
returns table (
  id         uuid,
  patient_id uuid,
  doctor_id  uuid,
  content    text,
  similarity float
)
language sql stable as $$
  select
    id,
    patient_id,
    doctor_id,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from notes
  order by embedding <=> query_embedding
  limit match_count;
$$;
```
