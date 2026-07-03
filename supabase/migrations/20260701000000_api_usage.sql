-- Per-user daily API usage counters for rate limiting /api/simulate and
-- /api/coach. Stores counts only — no narrative or transcript content —
-- so the zero-retention design is unaffected.
--
-- Run this in the Supabase SQL editor (or via supabase db push).

create table if not exists public.api_usage (
  user_id uuid not null,
  day date not null,
  endpoint text not null,
  count integer not null default 0,
  primary key (user_id, day, endpoint)
);

alter table public.api_usage enable row level security;
-- No RLS policies on purpose: the table is only touched by the
-- security-definer function below, never directly by clients.

-- Atomically increments the caller's counter and reports whether the new
-- count is within the limit. Returns true = allowed, false = over limit.
--
-- SECURITY: p_user_id must match the caller's own auth.uid(). Without this
-- check, any authenticated user could call this RPC directly (it is exposed
-- via the Supabase REST API) with another user's UUID and burn through the
-- victim's daily quota, locking them out of simulations.
create or replace function public.increment_api_usage(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'increment_api_usage: p_user_id must be the caller';
  end if;

  insert into public.api_usage (user_id, day, endpoint, count)
  values (p_user_id, current_date, p_endpoint, 1)
  on conflict (user_id, day, endpoint)
  do update set count = public.api_usage.count + 1
  returning count into new_count;
  return new_count <= p_limit;
end;
$$;

revoke all on function public.increment_api_usage(uuid, text, integer) from anon;
grant execute on function public.increment_api_usage(uuid, text, integer) to authenticated;
