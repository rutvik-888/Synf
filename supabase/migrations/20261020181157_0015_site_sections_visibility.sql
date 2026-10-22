/*
# Site Section Visibility Controls

## Overview
Adds a `site_sections` table that lets admins show or hide entire public sections
of the website (Frequency, Inside Synf, Community Wall, Goods, Drops, Synf Pass, etc.)
without removing any underlying data.

## New Table
- `site_sections` — one row per public section with a visibility toggle
  - `key` (text, unique) — section identifier e.g. "frequency", "goods"
  - `label` (text) — human-readable name shown in admin
  - `is_visible` (boolean, default true) — whether the section appears on the public site
  - `sort_order` (int) — admin display order

## Security
- RLS enabled: anon+authenticated can SELECT (needed to decide what to show)
- Only authenticated (staff) can INSERT/UPDATE/DELETE

## Defaults
All sections visible by default. Seeded rows for every public section.
*/

CREATE TABLE IF NOT EXISTS site_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order int DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE site_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_site_sections" ON site_sections;
CREATE POLICY "anon_read_site_sections" ON site_sections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_manage_site_sections" ON site_sections;
CREATE POLICY "auth_manage_site_sections" ON site_sections FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

INSERT INTO site_sections (key, label, sort_order) VALUES
  ('frequency', 'Frequency (Magazine)', 10),
  ('inside_synf', 'Inside Synf (Stories)', 11),
  ('community', 'Community Wall', 12),
  ('goods', 'Synf Goods (Merchandise)', 13),
  ('drops', 'Secret Drops', 14),
  ('pass', 'Synf Pass (Community Profiles)', 15),
  ('events', 'Events', 1),
  ('about', 'About', 2),
  ('people', 'The Collective', 3),
  ('jobs', 'Join (Jobs)', 4),
  ('collaborate', 'Collaborate', 5),
  ('contact', 'Contact', 6)
ON CONFLICT (key) DO NOTHING;
