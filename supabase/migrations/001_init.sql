-- =====================================================================
-- Inspiration Board — initial schema
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run.
-- It is safe to run more than once.
--
-- Contents:
--   1. Helper functions
--   2. profiles
--   3. inspirations (incl. AI-ready columns)
--   4. tags + inspiration_tags
--   5. ai_requests (log for future AI edge functions)
--   6. Row Level Security
--   7. Storage buckets + policies
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Helper functions
-- ---------------------------------------------------------------------

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. profiles — one row per auth user
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_path  text,                       -- path inside the "avatars" bucket
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a user signs up.
-- Default display name = part of the email before "@".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that existed before this migration.
insert into public.profiles (id, display_name)
select u.id, split_part(u.email, '@', 1)
from auth.users u
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 3. inspirations — a note, an image, or both
-- ---------------------------------------------------------------------

create table if not exists public.inspirations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note        text,
  image_path  text,                        -- path inside the "inspirations" bucket

  -- AI: image description (OpenAI) -------------------------------------
  image_description       text,
  image_description_model text,
  image_description_at    timestamptz,

  -- AI: image generated from the note (FAL.AI) -------------------------
  image_source text not null default 'upload',
  image_prompt text,                       -- prompt used when image_source = 'generated'

  -- AI: proofread (PL / EN) --------------------------------------------
  note_language     text,
  note_proofread_at timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint inspirations_note_or_image
    check (nullif(btrim(note), '') is not null or image_path is not null),
  constraint inspirations_image_source_check
    check (image_source in ('upload', 'generated')),
  constraint inspirations_note_language_check
    check (note_language is null or note_language in ('pl', 'en'))
);

create index if not exists inspirations_user_created_idx
  on public.inspirations (user_id, created_at desc);

drop trigger if exists inspirations_set_updated_at on public.inspirations;
create trigger inspirations_set_updated_at
  before update on public.inspirations
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 4. tags + inspiration_tags
-- ---------------------------------------------------------------------

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 50),
  created_at timestamptz not null default now()
);

-- One tag name per user, case-insensitive ("Portrait" = "portrait").
create unique index if not exists tags_user_name_unique
  on public.tags (user_id, lower(name));

create table if not exists public.inspiration_tags (
  inspiration_id uuid not null references public.inspirations (id) on delete cascade,
  tag_id         uuid not null references public.tags (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (inspiration_id, tag_id)
);

create index if not exists inspiration_tags_tag_idx  on public.inspiration_tags (tag_id);
create index if not exists inspiration_tags_user_idx on public.inspiration_tags (user_id);


-- ---------------------------------------------------------------------
-- 5. ai_requests — log of AI calls (written by edge functions later)
-- ---------------------------------------------------------------------

create table if not exists public.ai_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  inspiration_id uuid references public.inspirations (id) on delete set null,
  kind           text not null,
  provider       text not null,
  model          text,
  status         text not null default 'pending',
  input          jsonb,
  output         jsonb,
  error          text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz,

  constraint ai_requests_kind_check
    check (kind in ('describe_image', 'proofread', 'generate_image')),
  constraint ai_requests_provider_check
    check (provider in ('openai', 'fal')),
  constraint ai_requests_status_check
    check (status in ('pending', 'succeeded', 'failed'))
);

create index if not exists ai_requests_user_created_idx
  on public.ai_requests (user_id, created_at desc);


-- ---------------------------------------------------------------------
-- 6. Row Level Security — each user sees only their own rows
-- ---------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.inspirations     enable row level security;
alter table public.tags             enable row level security;
alter table public.inspiration_tags enable row level security;
alter table public.ai_requests      enable row level security;

-- profiles (rows are created by the trigger, so no insert/delete policy)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- inspirations
drop policy if exists "inspirations_select_own" on public.inspirations;
create policy "inspirations_select_own" on public.inspirations
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "inspirations_insert_own" on public.inspirations;
create policy "inspirations_insert_own" on public.inspirations
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "inspirations_update_own" on public.inspirations;
create policy "inspirations_update_own" on public.inspirations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "inspirations_delete_own" on public.inspirations;
create policy "inspirations_delete_own" on public.inspirations
  for delete to authenticated using (user_id = (select auth.uid()));

-- tags
drop policy if exists "tags_select_own" on public.tags;
create policy "tags_select_own" on public.tags
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "tags_insert_own" on public.tags;
create policy "tags_insert_own" on public.tags
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "tags_update_own" on public.tags;
create policy "tags_update_own" on public.tags
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "tags_delete_own" on public.tags;
create policy "tags_delete_own" on public.tags
  for delete to authenticated using (user_id = (select auth.uid()));

-- inspiration_tags (both linked rows must also belong to the user)
drop policy if exists "inspiration_tags_select_own" on public.inspiration_tags;
create policy "inspiration_tags_select_own" on public.inspiration_tags
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "inspiration_tags_insert_own" on public.inspiration_tags;
create policy "inspiration_tags_insert_own" on public.inspiration_tags
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.inspirations i
                where i.id = inspiration_id and i.user_id = (select auth.uid()))
    and exists (select 1 from public.tags t
                where t.id = tag_id and t.user_id = (select auth.uid()))
  );

drop policy if exists "inspiration_tags_delete_own" on public.inspiration_tags;
create policy "inspiration_tags_delete_own" on public.inspiration_tags
  for delete to authenticated using (user_id = (select auth.uid()));

-- ai_requests: users can read their own log. Only edge functions
-- (service role, which bypasses RLS) write to it.
drop policy if exists "ai_requests_select_own" on public.ai_requests;
create policy "ai_requests_select_own" on public.ai_requests
  for select to authenticated using (user_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 7. Storage — private buckets, files under "<user_id>/..."
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('inspirations', 'inspirations', false, 10485760,  -- 10 MB
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']),
  ('avatars', 'avatars', false, 2097152,             -- 2 MB
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The first folder of every object path must be the user's id.
drop policy if exists "user_files_select_own" on storage.objects;
create policy "user_files_select_own" on storage.objects
  for select to authenticated using (
    bucket_id in ('inspirations', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "user_files_insert_own" on storage.objects;
create policy "user_files_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('inspirations', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "user_files_update_own" on storage.objects;
create policy "user_files_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('inspirations', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('inspirations', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "user_files_delete_own" on storage.objects;
create policy "user_files_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id in ('inspirations', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
