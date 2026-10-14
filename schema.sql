-- Run in Supabase SQL Editor. Existing golfers and teams are preserved.
create table if not exists public.golf_volunteers (
 email text primary key,
 created_at timestamptz not null default now(),
 constraint email_lowercase check (email = lower(email))
);
alter table public.golf_volunteers enable row level security;
revoke all on public.golf_volunteers from anon, authenticated;

create or replace function public.is_golf_volunteer()
returns boolean
language sql stable security definer
set search_path = ''
as $$
 select auth.uid() is not null and exists (
  select 1 from public.golf_volunteers v
  where v.email = lower(auth.jwt() ->> 'email')
 );
$$;
revoke all on function public.is_golf_volunteer() from public, anon;
grant execute on function public.is_golf_volunteer() to authenticated;

alter table public.golf_teams enable row level security;
alter table public.golf_players enable row level security;

-- Replace broad starter policies from earlier setup.
drop policy if exists "Volunteers can view teams" on public.golf_teams;
drop policy if exists "Volunteers can view golfers" on public.golf_players;
drop policy if exists "Volunteers can update golfers" on public.golf_players;
drop policy if exists "golf teams approved read" on public.golf_teams;
drop policy if exists "golf players approved read" on public.golf_players;
drop policy if exists "golf players approved checkin" on public.golf_players;

create policy "golf teams approved read" on public.golf_teams
for select to authenticated using ((select public.is_golf_volunteer()));
create policy "golf players approved read" on public.golf_players
for select to authenticated using ((select public.is_golf_volunteer()));
create policy "golf players approved checkin" on public.golf_players
for update to authenticated
using ((select public.is_golf_volunteer()))
with check ((select public.is_golf_volunteer()));

revoke all on public.golf_teams from anon, authenticated;
revoke all on public.golf_players from anon, authenticated;
grant select on public.golf_teams to authenticated;
grant select on public.golf_players to authenticated;
grant update (checked_in, checked_in_at) on public.golf_players to authenticated;

-- Supabase Realtime: add the players table once.
do $$ begin
 if not exists (
  select 1 from pg_publication_tables
  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'golf_players'
 ) then
  alter publication supabase_realtime add table public.golf_players;
 end if;
end $$;

-- Add approved volunteer emails using this pattern, then run separately:
-- insert into public.golf_volunteers(email)
-- values ('volunteer@example.com')
-- on conflict (email) do nothing;
