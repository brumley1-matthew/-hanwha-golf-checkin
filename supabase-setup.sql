-- Run as a database administrator in Supabase SQL Editor.
-- This script does not modify or delete any existing golfers or teams.
BEGIN;
CREATE TABLE IF NOT EXISTS public.golf_volunteers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.golf_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_players ENABLE ROW LEVEL SECURITY;
-- Remove earlier permissive policies, if present.
DROP POLICY IF EXISTS "Volunteers can view teams" ON public.golf_teams;
DROP POLICY IF EXISTS "Volunteers can view golfers" ON public.golf_players;
DROP POLICY IF EXISTS "Volunteers can update golfers" ON public.golf_players;
DROP POLICY IF EXISTS "Approved volunteers read teams" ON public.golf_teams;
DROP POLICY IF EXISTS "Approved volunteers read golfers" ON public.golf_players;
DROP POLICY IF EXISTS "Approved volunteers update checkins" ON public.golf_players;
-- Only the SQL administrator/service role should manage approvals.
REVOKE ALL ON public.golf_volunteers FROM anon, authenticated;
GRANT SELECT ON public.golf_volunteers TO authenticated;
CREATE POLICY "Approved volunteers read teams" ON public.golf_teams FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.golf_volunteers v WHERE v.user_id=(SELECT auth.uid())));
CREATE POLICY "Approved volunteers read golfers" ON public.golf_players FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.golf_volunteers v WHERE v.user_id=(SELECT auth.uid())));
-- Use a column-level GRANT to prevent volunteers editing names/team assignments.
REVOKE UPDATE ON public.golf_players FROM authenticated;
GRANT SELECT ON public.golf_teams, public.golf_players TO authenticated;
GRANT UPDATE (checked_in,checked_in_at) ON public.golf_players TO authenticated;
CREATE POLICY "Approved volunteers update checkins" ON public.golf_players FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.golf_volunteers v WHERE v.user_id=(SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.golf_volunteers v WHERE v.user_id=(SELECT auth.uid())));
COMMIT;
-- Realtime: add the table to the publication only if it is not already included.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='golf_players') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.golf_players;
 END IF;
END $$;
-- After inviting volunteers in Authentication > Users, approve each user by running:
-- INSERT INTO public.golf_volunteers(user_id)
-- SELECT id FROM auth.users WHERE email = 'volunteer@example.com'
-- ON CONFLICT (user_id) DO NOTHING;
