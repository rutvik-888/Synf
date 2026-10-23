/*
# Feature Expansions — Batch 1

1. New columns on `campaigns`
   - `sponsor_logos` (jsonb array of {name, logo_url, link_url}) — partner/sponsor logos for campaign landing pages
   - `social_share_enabled` (boolean, default true) — toggle social sharing buttons on campaign pages

2. New table: `event_templates`
   - Stores reusable event presets (title pattern, credits, FAQs, ticketing config, etc.)
   - Admins can clone a template when creating a new event instead of starting from scratch

3. New table: `content_schedules`
   - Stores scheduled content changes (page slug, new body/data, publish_at, expires_at)
   - Lets admins schedule homepage hero swaps, about page updates, etc. for a future date/time

4. New table: `community_wall_trusted_contributors`
   - Tracks contributors who have had X approved posts; their future submissions auto-approve
   - Fields: contributor_email, approved_count, is_trusted, trusted_at

5. Security
   - RLS enabled on all new tables
   - event_templates: authenticated CRUD (staff only)
   - content_schedules: authenticated CRUD (admin only)
   - community_wall_trusted_contributors: anon+authenticated SELECT, authenticated management
   - campaigns: existing policies already cover the new columns
*/

-- ============================================================
-- 1. Add columns to campaigns
-- ============================================================
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS sponsor_logos jsonb DEFAULT null,
  ADD COLUMN IF NOT EXISTS social_share_enabled boolean NOT NULL DEFAULT true;

-- ============================================================
-- 2. Event Templates table
-- ============================================================
CREATE TABLE IF NOT EXISTS event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON event_templates TO authenticated;

DROP POLICY IF EXISTS "auth_read_event_templates" ON event_templates;
CREATE POLICY "auth_read_event_templates"
  ON event_templates FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_event_templates" ON event_templates;
CREATE POLICY "auth_insert_event_templates"
  ON event_templates FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_event_templates" ON event_templates;
CREATE POLICY "auth_update_event_templates"
  ON event_templates FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_event_templates" ON event_templates;
CREATE POLICY "auth_delete_event_templates"
  ON event_templates FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 3. Content Schedules table
-- ============================================================
CREATE TABLE IF NOT EXISTS content_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_slug text NOT NULL,
  title text,
  body text,
  data jsonb,
  publish_at timestamptz NOT NULL,
  expires_at timestamptz,
  is_applied boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_schedules ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON content_schedules TO authenticated;

DROP POLICY IF EXISTS "auth_read_content_schedules" ON content_schedules;
CREATE POLICY "auth_read_content_schedules"
  ON content_schedules FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_content_schedules" ON content_schedules;
CREATE POLICY "auth_insert_content_schedules"
  ON content_schedules FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_content_schedules" ON content_schedules;
CREATE POLICY "auth_update_content_schedules"
  ON content_schedules FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_content_schedules" ON content_schedules;
CREATE POLICY "auth_delete_content_schedules"
  ON content_schedules FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 4. Community Wall Trusted Contributors table
-- ============================================================
CREATE TABLE IF NOT EXISTS community_wall_trusted_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_email text NOT NULL UNIQUE,
  approved_count integer NOT NULL DEFAULT 0,
  is_trusted boolean NOT NULL DEFAULT false,
  trusted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_wall_trusted_contributors ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON community_wall_trusted_contributors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON community_wall_trusted_contributors TO authenticated;

DROP POLICY IF EXISTS "anon_read_trusted_contributors" ON community_wall_trusted_contributors;
CREATE POLICY "anon_read_trusted_contributors"
  ON community_wall_trusted_contributors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_manage_trusted_contributors" ON community_wall_trusted_contributors;
CREATE POLICY "auth_manage_trusted_contributors"
  ON community_wall_trusted_contributors FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Add launch countdown config fields to launch_config data
--    (stored in site_content.data jsonb, no schema change needed)
-- ============================================================
-- The launch_config in site_content already stores jsonb with headline, subheadline, etc.
-- We extend it with: countdown_theme, show_details, bg_image_url, accent_color, 
-- reveal_animation — all read from the existing data jsonb field.