/*
# Launch Mode Settings

## Overview
Adds a `launch_config` row to the existing `site_content` table so admins can
control a "coming soon" countdown that gates the public website. When the
launch date has not yet passed and launch mode is enabled, visitors see a
cinematic countdown page instead of the normal site. The site automatically
goes live once the countdown reaches zero.

## Changes
- Inserts a `launch_config` row into `site_content`:
  - enabled: false (admin toggles on when ready)
  - launch_date: null (admin sets the target date/time)
  - headline: "Something extraordinary is coming"
  - subheadline: "Team Synf — We don't do ordinary."
  - background_theme: 'synf' (color palette for the countdown page)
  - show_email_signup: true (collect emails before launch)

## Security
- Uses existing `site_content` RLS policies — no new policies needed.
- Public can only read `is_public = true` rows (so the frontend can fetch the config).
- Only staff can write (via existing `is_staff()` check).
*/

INSERT INTO public.site_content (slug, title, body, data, is_public)
VALUES (
  'launch_config',
  'Launch Mode Settings',
  'Controls the coming-soon countdown page that gates the public website.',
  jsonb_build_object(
    'enabled', false,
    'launch_date', null,
    'headline', 'Something extraordinary is coming',
    'subheadline', 'Team Synf — We don''t do ordinary.',
    'background_theme', 'synf',
    'show_email_signup', true
  ),
  true
)
ON CONFLICT (slug) DO NOTHING;
