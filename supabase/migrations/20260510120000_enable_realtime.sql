-- Enable realtime CDC on patient_notes so all connected clients
-- see new notes appear instantly without page refresh.
alter publication supabase_realtime add table public.patient_notes;

-- Full replica identity required for realtime filters on non-PK columns.
alter table public.patient_notes replica identity full;
