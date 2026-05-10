-- Notifications: per-user inbox messages.
-- Allowed senders (assigned practitioner pinging family, family pinging
-- doctor, or AI pinging the entire care team after a concerning check-in)
-- are validated in the Server Action / tool layer at insert time. RLS
-- only restricts who can read/update their own notifications.

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null,                  -- auth.users.id of the recipient
  sender_id     uuid,                           -- auth.users.id of human sender; null when sent by AI
  sender_label  text not null,                  -- e.g. "AI", "Dr. Okafor", "System"
  patient_id    uuid references public.patients(id) on delete cascade,
  title         text not null,
  body          text not null,
  urgency       text not null default 'normal'
    check (urgency in ('low','normal','high','urgent')),
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

create index notifications_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

-- SELECT: only the recipient can read their own notifications.
create policy "recipients can read own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());

-- UPDATE: only the recipient can update their own notifications
-- (intended use is flipping read_at; the action layer is responsible
--  for not exposing other column changes).
create policy "recipients can update own notifications"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- INSERT is intentionally permissive at the RLS layer — the Server
-- Action / AI tool layer enforces who is allowed to ping whom.
create policy "authenticated users can insert notifications"
  on public.notifications for insert to authenticated
  with check (true);

-- Realtime: broadcast inserts/updates so the inbox can react live.
alter publication supabase_realtime add table public.notifications;
