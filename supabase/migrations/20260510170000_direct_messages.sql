-- Direct messages: 1:1 conversations between two users.
-- Allowed pairs (practitioner/patient/relative within an organization)
-- are validated in the Server Action layer at thread creation time.
-- Once a thread exists, RLS only checks participation.

create table public.dm_threads (
  id          uuid primary key default gen_random_uuid(),
  user_a_id   uuid not null,
  user_b_id   uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_a_id, user_b_id),
  check (user_a_id < user_b_id)
);

create index dm_threads_user_a_idx on public.dm_threads (user_a_id, updated_at desc);
create index dm_threads_user_b_idx on public.dm_threads (user_b_id, updated_at desc);

create table public.dm_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.dm_threads(id) on delete cascade,
  sender_id   uuid not null,
  content     text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index dm_messages_thread_idx on public.dm_messages (thread_id, created_at);

alter table public.dm_threads  enable row level security;
alter table public.dm_messages enable row level security;

-- dm_threads: participants can SELECT/INSERT/UPDATE.
create policy "participants can read own threads"
  on public.dm_threads for select to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "participants can create own threads"
  on public.dm_threads for insert to authenticated
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "participants can update own threads"
  on public.dm_threads for update to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id)
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- dm_messages: only thread participants may read; only senders who are
-- participants may insert. (No UPDATE/DELETE policies in v1; markThreadRead
-- runs through the service-role admin client.)
create policy "participants can read thread messages"
  on public.dm_messages for select to authenticated
  using (
    exists (
      select 1 from public.dm_threads t
      where t.id = thread_id
        and (auth.uid() = t.user_a_id or auth.uid() = t.user_b_id)
    )
  );

create policy "participants can send messages"
  on public.dm_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.dm_threads t
      where t.id = thread_id
        and (auth.uid() = t.user_a_id or auth.uid() = t.user_b_id)
    )
  );

-- Realtime: broadcast inserts/updates on these tables to subscribed clients.
alter publication supabase_realtime add table public.dm_threads;
alter publication supabase_realtime add table public.dm_messages;
