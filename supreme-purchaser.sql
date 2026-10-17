-- Adds payer tracking without changing existing team purchases or golfers.
alter table public.golf_teams
  add column if not exists supreme_purchased_by bigint
  references public.golf_players(id) on delete set null;
grant select (supreme_purchased_by), update (supreme_purchased_by)
  on public.golf_teams to authenticated;
comment on column public.golf_teams.supreme_purchased_by is
  'Golfer who paid for the team Supreme package; null for older purchases where payer was not recorded.';
notify pgrst, 'reload schema';
