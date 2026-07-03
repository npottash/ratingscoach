-- Advisory session requests from /advisory. Inserted via the service role in
-- a server action (same pattern as the waitlist table). No client access.
--
-- Run this in the Supabase SQL editor (or via supabase db push).

create table if not exists public.advisory_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.advisory_requests enable row level security;
-- No RLS policies: only the service role (server action) writes here.
