-- Feedback submissions from /contact. Inserted via the service role in a
-- server action (same pattern as advisory_requests). No client access.
--
-- Run this in the Supabase SQL editor (or via supabase db push).

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
-- No RLS policies: only the service role (server action) writes here.
