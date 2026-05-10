-- Module 4: Realtime — add organizations to supabase_realtime publication
-- so Postgres CDC events (INSERT/UPDATE/DELETE) fire on it.
alter publication supabase_realtime add table public.organizations;
