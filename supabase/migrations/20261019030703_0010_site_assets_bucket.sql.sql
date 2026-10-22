/*
# Site assets storage bucket + favicon support

## Purpose
A public storage bucket for site branding assets (favicon, logo, etc.).
Admins can upload; the public can read.

## Storage bucket
- `site-assets` (public)

## Policies
- SELECT: public (anon + authenticated) — branding assets are public.
- INSERT/UPDATE/DELETE: staff only (is_staff()).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "public_read_site_assets" ON storage.objects;
CREATE POLICY "public_read_site_assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'site-assets');

-- Staff write
DROP POLICY IF EXISTS "staff_insert_site_assets" ON storage.objects;
CREATE POLICY "staff_insert_site_assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "staff_update_site_assets" ON storage.objects;
CREATE POLICY "staff_update_site_assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "staff_delete_site_assets" ON storage.objects;
CREATE POLICY "staff_delete_site_assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site-assets');
