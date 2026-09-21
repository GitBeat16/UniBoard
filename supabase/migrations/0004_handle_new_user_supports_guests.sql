-- Applied to the live project as 20260920133451_handle_new_user_supports_guests.
-- Backfilled into the repo so a fresh database matches production.

-- Anonymous (guest) users have no email, so split_part(null, ...) produced a
-- null display name and the app greeted them with "Hello, there".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Guest'
    )
  );
  return new;
end;
$fn$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
