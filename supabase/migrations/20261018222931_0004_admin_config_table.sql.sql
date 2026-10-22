/*
# Admin configuration table for server-side secrets fallback

## Purpose
Provides a server-side storage mechanism for the admin invite code that can be
managed via SQL (since edge function env secrets cannot be set programmatically
in this environment). The admin-signup edge function reads from this table as a
fallback when the ADMIN_INVITE_CODE env var is not set.

## Changes
1. New table: `admin_config`
   - `key` (text, primary key) — config key e.g. 'admin_invite_code'
   - `value` (text, not null) — the config value
   - `updated_at` (timestamptz)

2. Security
   - RLS ENABLED on admin_config
   - No SELECT policy for anon or authenticated — only the service role (which
     bypasses RLS) can read this table. This keeps the invite code server-side.
   - No INSERT/UPDATE/DELETE policies for anon or authenticated either.

3. Seed the admin invite code = 80811

## Important notes
1. The service role key used by edge functions bypasses RLS, so the edge function
   can read this table freely.
2. No anon/authenticated policies are added — the browser client can NEVER read
   this table, keeping the invite code fully server-side.
*/

CREATE TABLE IF NOT EXISTS public.admin_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Seed the invite code (idempotent)
INSERT INTO public.admin_config (key, value) VALUES ('admin_invite_code', '80811')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
