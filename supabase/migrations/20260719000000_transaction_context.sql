-- Transaction context for Transaction Update sessions: type, size, financing
-- mix, expected close. Nullable jsonb; existing rows and non-transaction
-- sessions simply leave it null. Covered by the existing user-scoped RLS
-- policies on sessions.
alter table public.sessions
  add column if not exists transaction_context jsonb;
