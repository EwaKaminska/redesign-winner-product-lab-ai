-- =====================================================================
-- Inspiration Board — table privileges for the Data API
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run.
-- It is safe to run more than once.
--
-- New Supabase projects do not give the "authenticated" role access to
-- new tables. Without these grants, every request fails with
-- "permission denied for table ...". RLS policies (001_init.sql) still
-- decide which rows each user can see.
--
-- Grants match the policies. "anon" gets nothing: logged-out users
-- read no data.
-- =====================================================================

grant usage on schema public to authenticated;

-- profiles: rows are created by a trigger, so no insert or delete.
grant select, update on public.profiles to authenticated;

grant select, insert, update, delete on public.inspirations to authenticated;
grant select, insert, update, delete on public.tags         to authenticated;

-- inspiration_tags: there is no update policy, links are added or removed.
grant select, insert, delete on public.inspiration_tags to authenticated;

-- ai_requests: users only read. Edge functions write with the service role.
grant select on public.ai_requests to authenticated;
grant all    on public.ai_requests to service_role;

-- The service role (edge functions) needs full access to all tables.
grant all on public.profiles, public.inspirations, public.tags,
             public.inspiration_tags
  to service_role;
