-- Commitments management has made to an agency ("we told Moody's buybacks
-- pause below 12.5% CET1"). Agencies remember and check — future simulations
-- probe open commitments. Per-user, client-accessed under RLS.

create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  issuer_name text not null,
  agency text not null,
  commitment_text text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.commitments enable row level security;

create policy commitments_select_own on public.commitments
  for select using (auth.uid() = user_id);
create policy commitments_insert_own on public.commitments
  for insert with check (auth.uid() = user_id);
create policy commitments_update_own on public.commitments
  for update using (auth.uid() = user_id);
create policy commitments_delete_own on public.commitments
  for delete using (auth.uid() = user_id);
