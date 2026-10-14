-- Run once in Supabase SQL Editor. Does NOT alter existing golfers or teams.
BEGIN;
CREATE TABLE IF NOT EXISTS public.approved_volunteers (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 approved boolean NOT NULL DEFAULT true
);
ALTER TABLE public.approved_volunteers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Volunteer can view own approval" ON public.approved_volunteers;
CREATE POLICY "Volunteer can view own approval" ON public.approved_volunteers FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
GRANT SELECT ON public.approved_volunteers TO authenticated;
REVOKE ALL ON public.approved_volunteers FROM anon;

ALTER TABLE public.golf_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_players ENABLE ROW LEVEL SECURITY;
-- Remove previous broad volunteer policies, if present.
DROP POLICY IF EXISTS "Volunteers can view teams" ON public.golf_teams;
DROP POLICY IF EXISTS "Volunteers can view golfers" ON public.golf_players;
DROP POLICY IF EXISTS "Volunteers can update golfers" ON public.golf_players;
DROP POLICY IF EXISTS "Approved volunteers read teams" ON public.golf_teams;
DROP POLICY IF EXISTS "Approved volunteers read players" ON public.golf_players;
DROP POLICY IF EXISTS "Approved volunteers check in players" ON public.golf_players;

CREATE POLICY "Approved volunteers read teams" ON public.golf_teams
 FOR SELECT TO authenticated USING (EXISTS (
 SELECT 1 FROM public.approved_volunteers v WHERE v.user_id=(select auth.uid()) AND v.approved=true));
CREATE POLICY "Approved volunteers read players" ON public.golf_players
 FOR SELECT TO authenticated USING (EXISTS (
 SELECT 1 FROM public.approved_volunteers v WHERE v.user_id=(select auth.uid()) AND v.approved=true));
CREATE POLICY "Approved volunteers check in players" ON public.golf_players
 FOR UPDATE TO authenticated USING (EXISTS (
 SELECT 1 FROM public.approved_volunteers v WHERE v.user_id=(select auth.uid()) AND v.approved=true))
 WITH CHECK (EXISTS (
 SELECT 1 FROM public.approved_volunteers v WHERE v.user_id=(select auth.uid()) AND v.approved=true));
-- Crucial: revoke table-wide UPDATE; grant only check-in columns.
REVOKE ALL ON public.golf_teams FROM anon, authenticated;
REVOKE ALL ON public.golf_players FROM anon, authenticated;
GRANT SELECT ON public.golf_teams TO authenticated;
GRANT SELECT ON public.golf_players TO authenticated;
GRANT UPDATE (checked_in, checked_in_at) ON public.golf_players TO authenticated;
COMMIT;

-- Enable realtime for golf_players. Safe to run once; if already published, skip this line.
ALTER PUBLICATION supabase_realtime ADD TABLE public.golf_players;
