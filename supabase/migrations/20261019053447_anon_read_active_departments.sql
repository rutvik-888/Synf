/*
# Allow public read access to departments

1. Purpose
- The public People page now lists departmental categories as filters. Visitors (not signed in) need to read the active departments list so the filter chips and profile cards can show department names.

2. Security changes
- `departments`: replace the existing `anon_read_departments` policy (which had `USING (false)`) with one that allows anon to read only active departments. Authenticated staff access is unchanged.
- This is a read-only policy. No insert/update/delete access is granted to anon.

3. Notes
- Drops the existing policy first so the statement is idempotent.
*/

DROP POLICY IF EXISTS "anon_read_departments" ON public.departments;

CREATE POLICY "anon_read_departments"
ON public.departments FOR SELECT
TO anon
USING (is_active = true);
