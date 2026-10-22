/*
# Intro Experience Settings

## Overview
Adds a settings row to `site_content` for the cinematic intro experience.
Uses the existing `site_content` table which already has proper RLS:
- Public can read rows where `is_public = true`
- Staff can read/write all rows

## Changes
- Inserts a `intro_config` row into `site_content` with default settings:
  - enabled: true
  - sound_enabled: true
  - sound_opt_in: true (sound only plays after user opt-in)
  - duration_ms: 4200
  - treatment: 'cinematic' (the only treatment available)
  - show_on_every_visit: false (session-based, shows once per session)

## Security
- Uses existing `site_content` RLS policies — no new policies needed.
- Public can only read `is_public = true` rows.
- Only staff can write (via existing `is_staff()` check).
*/

INSERT INTO public.site_content (slug, title, body, data, is_public)
VALUES (
  'intro_config',
  'Intro Experience Settings',
  'Configuration for the cinematic intro screen and sound identity.',
  jsonb_build_object(
    'enabled', true,
    'sound_enabled', true,
    'sound_opt_in', true,
    'duration_ms', 4200,
    'treatment', 'cinematic',
    'show_on_every_visit', false
  ),
  true
)
ON CONFLICT (slug) DO NOTHING;
