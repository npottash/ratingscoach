-- Persist the generated scorecard on the per-run session row (derived work
-- product only — the narrative and raw transcript remain ephemeral) so past
-- sessions can re-render and export from the dashboard.
alter table public.sessions add column if not exists scorecard_output jsonb;
