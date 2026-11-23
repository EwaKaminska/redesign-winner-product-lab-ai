-- =====================================================================
-- Inspiration Board — AI log: allow the "suggest_tags" action
--
-- The hyper-worker edge function has a new action that suggests tags.
-- The ai_requests log must accept its kind.
--
-- It is safe to run more than once.
-- =====================================================================

alter table public.ai_requests
  drop constraint if exists ai_requests_kind_check;

alter table public.ai_requests
  add constraint ai_requests_kind_check
  check (kind in ('describe_image', 'proofread', 'generate_image', 'suggest_tags'));
