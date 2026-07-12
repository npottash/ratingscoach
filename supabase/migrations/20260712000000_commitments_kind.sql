-- Commitments split into qualitative vs quantitative for targeted tracking.
alter table public.commitments
  add column if not exists kind text not null default 'qualitative';
