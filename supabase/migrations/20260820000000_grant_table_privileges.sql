-- Fix: RLS policies alone don't grant table access — anon/authenticated
-- roles need explicit GRANTs or every query fails with 42501 "permission denied".

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

GRANT SELECT, INSERT ON public.versions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.versions TO authenticated;

GRANT SELECT ON public.reports TO anon, authenticated;
GRANT SELECT ON public.comparisons TO anon, authenticated;

GRANT SELECT ON public.share_links TO anon;
GRANT SELECT, INSERT ON public.share_links TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.chat_sessions TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;
