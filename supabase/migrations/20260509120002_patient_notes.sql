-- Patient notes: clinical observations written by practitioners,
-- scoped to organization, searchable via pgvector embeddings.

create table public.patient_notes (
  id          uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id  uuid not null references public.patients(id) on delete cascade,
  author_id   uuid not null references public.profiles(user_id) on delete cascade,
  content     text not null,
  embedding   vector(768),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Indexes for common access patterns
create index patient_notes_org_idx on public.patient_notes (organization_id);
create index patient_notes_patient_idx on public.patient_notes (patient_id, created_at desc);
create index patient_notes_author_idx on public.patient_notes (author_id, created_at desc);

-- HNSW index for semantic search (cosine distance)
create index patient_notes_embedding_idx on public.patient_notes
  using hnsw (embedding vector_cosine_ops);

alter table public.patient_notes enable row level security;

-- ── READ (SELECT) ──────────��──────────────────────────────────────────────────

-- Organization admin: read all notes in their organization
create policy "organization admin can read organization notes"
  on public.patient_notes for select to authenticated
  using (
    (select role from public.profiles where user_id = auth.uid()) = 'organization_admin'
    and organization_id = (select organization_id from public.profiles where user_id = auth.uid())
  );

-- Practitioner: read all notes within their organization
create policy "practitioner can read organization notes"
  on public.patient_notes for select to authenticated
  using (
    (select role from public.profiles where user_id = auth.uid()) = 'practitioner'
    and organization_id = (select organization_id from public.profiles where user_id = auth.uid())
  );

-- Patient: read notes about themselves
create policy "patient can read own notes"
  on public.patient_notes for select to authenticated
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Relative: read notes for the patient they are linked to
create policy "relative can read linked patient notes"
  on public.patient_notes for select to authenticated
  using (
    patient_id in (
      select patient_id from public.relatives where user_id = auth.uid()
    )
  );

-- ── WRITE (INSERT only — append-only clinical record) ─���───────────────────────

-- Practitioner: add notes about any patient in their organization
create policy "practitioner can insert organization notes"
  on public.patient_notes for insert to authenticated
  with check (
    (select role from public.profiles where user_id = auth.uid()) = 'practitioner'
    and organization_id = (select organization_id from public.profiles where user_id = auth.uid())
    and author_id = auth.uid()
  );

-- Patient: add notes about themselves
create policy "patient can insert own notes"
  on public.patient_notes for insert to authenticated
  with check (
    author_id = auth.uid()
    and patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Relative: add notes about their linked patient
create policy "relative can insert linked patient notes"
  on public.patient_notes for insert to authenticated
  with check (
    author_id = auth.uid()
    and patient_id in (
      select patient_id from public.relatives where user_id = auth.uid()
    )
  );
