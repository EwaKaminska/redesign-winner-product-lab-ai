-- =====================================================================
-- Inspiration Board — no automatic display name
--
-- Before: a new profile got the part of the email before "@" as its name.
-- Now:    display_name stays empty (null) until the user sets a name in
--         Account settings. The app shows the full email in the meantime.
--
-- It is safe to run more than once.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Clear the names that the old trigger wrote, so these accounts also
-- show the email. A name that the user typed is kept, unless it is
-- exactly the part of the email before "@".
update public.profiles p
set display_name = null
from auth.users u
where u.id = p.id
  and p.display_name = split_part(u.email, '@', 1);
