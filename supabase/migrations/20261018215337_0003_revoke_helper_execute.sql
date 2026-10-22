-- Revoke direct EXECUTE on role helper functions from anon and authenticated.
-- These helpers are only used inside RLS policies; they read the caller JWT and
-- return a boolean/string, so direct RPC calls leak nothing, but we close the
-- exposed API surface. Policies still work (they bypass GRANT checks).

revoke execute on function public.user_role() from anon, authenticated;
revoke execute on function public.is_staff() from anon, authenticated;
revoke execute on function public.is_admin_or_owner() from anon, authenticated;
revoke execute on function public.is_owner() from anon, authenticated;
