-- Remove the key_topics field. It duplicated the narrative's purpose, was a
-- weak signal in the simulation prompt, and — unlike the narrative — persisted
-- free-text issuer content to the database. Dropping the column also purges
-- any content already stored in it.
--
-- Run this in the Supabase SQL editor (or via supabase db push).
-- Destructive: existing key_topics values are permanently removed.

alter table public.sessions
  drop column if exists key_topics;
