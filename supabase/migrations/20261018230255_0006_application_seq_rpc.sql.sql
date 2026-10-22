/*
# Application sequence RPC function
Provides a concurrency-safe way to get the next application sequence number.
*/
CREATE OR REPLACE FUNCTION public.nextval_application_seq()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('public.application_seq');
$$;

-- Grant execute to the service role (edge functions use service role key)
GRANT EXECUTE ON FUNCTION public.nextval_application_seq() TO authenticated, anon, service_role;
