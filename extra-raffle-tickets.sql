alter table public.golf_players add column if not exists extra_raffle_tickets integer not null default 0 check (extra_raffle_tickets between 0 and 10000);
grant update (extra_raffle_tickets) on public.golf_players to authenticated;
