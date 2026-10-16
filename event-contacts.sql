create table public.golf_event_contacts (
id uuid primary key default gen_random_uuid(),
name text not null check(length(trim(name)) between 1 and 120),
phone text not null check(phone ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'),
consent boolean not null check(consent=true),
created_at timestamptz not null default now(),
consent_version text not null default 'golf-event-updates-v1'
);
alter table public.golf_event_contacts enable row level security;
revoke all on public.golf_event_contacts from anon,authenticated;
grant insert(name,phone,consent) on public.golf_event_contacts to anon,authenticated;
grant select on public.golf_event_contacts to authenticated;
create policy event_contacts_signup on public.golf_event_contacts for insert to anon,authenticated with check(consent=true);
create policy event_contacts_volunteer_read on public.golf_event_contacts for select to authenticated using ((select public.is_approved_volunteer()));