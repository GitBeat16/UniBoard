-- Live version 20260920090511. Backfilled into the repo so a fresh database matches production.

-- handle_new_user() is only ever invoked by the on_auth_user_created trigger.
-- Leaving EXECUTE granted to public exposes it at /rest/v1/rpc/handle_new_user.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
