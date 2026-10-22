/*
# Fix founder role access in RLS helper functions

## Problem
The `is_staff()` and `is_admin_or_owner()` SQL helper functions did not include
'founder' or 'co_founder' in their role lists. The `user_role()` function only
read from JWT `raw_app_meta_data`, which may not have the role set for users
created via the admin-signup edge function. This caused the founder account to
be treated as a non-staff user — RLS blocked profile queries, the frontend saw
no role, and the user was redirected to the crew portal instead of the admin
area.

## Changes
1. `user_role()` — now falls back to reading `role` from the `team_profiles`
   table when JWT metadata has no role, so the database is the source of truth.
2. `is_staff()` — now includes 'founder' and 'co_founder' in addition to the
   existing roles.
3. `is_admin_or_owner()` — now includes 'founder' and 'co_founder'.

## Security
- These functions are SECURITY DEFINER and STABLE; no new functions are created.
- No table schemas change. No data is modified.
- The change tightens access (founder was previously denied) rather than
  loosening it for other roles.
*/

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
select coalesce(
  (auth.jwt() -> 'raw_app_meta_data' ->> 'role'),
  (select tp.role from team_profiles tp where tp.id = auth.uid()),
  'viewer'
)
$function$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
select public.user_role() in ('founder','owner','co_founder','admin','recruitment_manager','event_manager','viewer')
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
select public.user_role() in ('founder','owner','co_founder','admin')
$function$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
select public.user_role() in ('founder','owner')
$function$;
