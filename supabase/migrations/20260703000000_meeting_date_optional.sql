-- Meeting date is display metadata only — it is never passed to the
-- simulation model — so it should not block session creation.
--
-- Run this in the Supabase SQL editor (or via supabase db push).
-- Harmless if the column is already nullable.

alter table public.sessions
  alter column meeting_date drop not null;
