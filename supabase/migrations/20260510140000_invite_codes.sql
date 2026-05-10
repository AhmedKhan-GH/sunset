create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null unique,
  created_by uuid not null,
  used_at integer,
  created_at integer not null default extract(epoch from now())::integer
);

alter table public.invite_codes enable row level security;

create policy "organization members can read invite codes they created"
  on public.invite_codes for select to authenticated
  using (created_by = auth.uid());

create policy "platform admin can manage all invite codes"
  on public.invite_codes for all to authenticated
  using ((select role from profiles where user_id = auth.uid()) = 'platform_admin')
  with check ((select role from profiles where user_id = auth.uid()) = 'platform_admin');
