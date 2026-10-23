/*
# Community Wall Trusted Contributors & Auto-Approve System

1. New Tables
- `community_wall_trusted_contributors`
  - `id` (uuid, primary key)
  - `contributor_email` (text, unique — identifies a contributor across submissions)
  - `is_trusted` (boolean, default false — when true, future posts auto-approve)
  - `approved_count` (int, default 0 — tracks number of approved posts, updated by trigger)
  - `trusted_at` (timestamptz, nullable — when trust was granted)
  - `created_at` / `updated_at` (timestamptz)

2. Functions & Triggers
- `community_wall_auto_approve()` — BEFORE INSERT: if contributor is trusted, auto-approve the post
- `community_wall_update_trusted_count()` — AFTER INSERT/UPDATE: increment approved_count, auto-promote to trusted at 3+ approved posts

3. Security
- Enable RLS on `community_wall_trusted_contributors`
- Grant CRUD to `authenticated` (admin management)
*/

CREATE TABLE IF NOT EXISTS community_wall_trusted_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_email text UNIQUE NOT NULL,
  is_trusted boolean NOT NULL DEFAULT false,
  approved_count integer NOT NULL DEFAULT 0,
  trusted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE community_wall_trusted_contributors ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON community_wall_trusted_contributors TO authenticated;
GRANT SELECT ON community_wall_trusted_contributors TO service_role;

DROP POLICY IF EXISTS "auth_select_trusted_contributors" ON community_wall_trusted_contributors;
CREATE POLICY "auth_select_trusted_contributors"
  ON community_wall_trusted_contributors FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_trusted_contributors" ON community_wall_trusted_contributors;
CREATE POLICY "auth_insert_trusted_contributors"
  ON community_wall_trusted_contributors FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_trusted_contributors" ON community_wall_trusted_contributors;
CREATE POLICY "auth_update_trusted_contributors"
  ON community_wall_trusted_contributors FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_trusted_contributors" ON community_wall_trusted_contributors;
CREATE POLICY "auth_delete_trusted_contributors"
  ON community_wall_trusted_contributors FOR DELETE
  TO authenticated USING (true);

-- Auto-approve: when a post is submitted by a trusted contributor, set status to 'approved'
CREATE OR REPLACE FUNCTION community_wall_auto_approve()
RETURNS TRIGGER AS $$
DECLARE
  _trusted boolean;
BEGIN
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email != '' AND NEW.status = 'pending' THEN
    SELECT is_trusted INTO _trusted FROM community_wall_trusted_contributors WHERE contributor_email = NEW.contact_email LIMIT 1;
    IF _trusted THEN
      NEW.status := 'approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS community_wall_auto_approve_trigger ON community_wall_posts;
CREATE TRIGGER community_wall_auto_approve_trigger
  BEFORE INSERT ON community_wall_posts
  FOR EACH ROW EXECUTE FUNCTION community_wall_auto_approve();

-- Auto-update trusted contributor counts when a post is approved
CREATE OR REPLACE FUNCTION community_wall_update_trusted_count()
RETURNS TRIGGER AS $$
DECLARE
  _count_increment integer;
BEGIN
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email != '' THEN
    _count_increment := CASE WHEN NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status != 'approved') THEN 1 ELSE 0 END;
    
    INSERT INTO community_wall_trusted_contributors (contributor_email, approved_count)
    VALUES (NEW.contact_email, _count_increment)
    ON CONFLICT (contributor_email) DO UPDATE
    SET
      approved_count = community_wall_trusted_contributors.approved_count + _count_increment,
      updated_at = now(),
      is_trusted = CASE
        WHEN community_wall_trusted_contributors.approved_count + _count_increment >= 3
        THEN true
        ELSE community_wall_trusted_contributors.is_trusted
      END,
      trusted_at = CASE
        WHEN community_wall_trusted_contributors.approved_count + _count_increment >= 3 AND community_wall_trusted_contributors.trusted_at IS NULL
        THEN now()
        ELSE community_wall_trusted_contributors.trusted_at
      END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS community_wall_auto_trust_trigger ON community_wall_posts;
CREATE TRIGGER community_wall_auto_trust_trigger
  AFTER INSERT OR UPDATE ON community_wall_posts
  FOR EACH ROW EXECUTE FUNCTION community_wall_update_trusted_count();
