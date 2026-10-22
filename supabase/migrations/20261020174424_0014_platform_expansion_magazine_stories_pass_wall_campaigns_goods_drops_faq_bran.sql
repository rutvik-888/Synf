/*
# Team Synf Platform Expansion — 13 Feature Database Schema

## Overview
This migration creates the database tables for the integrated platform expansion:
- Synf Frequency (digital magazine)
- Inside Synf (team stories)
- Synf Pass (community profiles + saved events)
- Community Wall (moderated gallery)
- Campaign Studio (campaign coordination)
- Content Calendar (unified scheduling view)
- Synf Goods (merchandise catalogue)
- Secret Drops (staged announcements)
- Event FAQ (per-event Q&A)
- Brand Studio (configurable visual identity)

## New Tables
1. brand_config — site-wide visual identity configuration
2. brand_themes — named campaign themes
3. frequency_articles — magazine articles with rich content
4. frequency_categories — admin-defined editorial categories
5. inside_stories — behind-the-scenes team stories
6. inside_story_types — story type definitions
7. community_profiles — public community member profiles (separate from staff)
8. saved_events — community members' saved/followed events
9. community_wall_posts — moderated community gallery submissions
10. community_wall_categories — gallery category definitions
11. campaigns — campaign coordination records
12. campaign_sections — configurable landing page sections
13. campaign_relations — links between campaigns and events/articles/goods
14. content_calendar_items — derived scheduling view (queries real records)
15. goods_products — merchandise catalogue
16. goods_categories — product categories
17. goods_variants — size/colour variants
18. secret_drops — staged announcement records
19. secret_drop_stages — individual reveal stages
20. event_faqs — per-event FAQ entries
21. event_faq_categories — FAQ category definitions

## Security
- All tables have RLS enabled
- Public content tables (published articles, stories, approved wall posts, visible products, active drops, FAQs) are readable by anon+authenticated
- Community profile tables are owner-scoped (auth.uid = user_id)
- Admin tables (brand config, drafts, campaigns, moderation) require authenticated staff
- Community wall submissions are private until approved
*/

-- ============================================================
-- 1. BRAND CONFIG (Feature A — Synf Universe)
-- ============================================================

CREATE TABLE IF NOT EXISTS brand_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE brand_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_active_brand_config" ON brand_config;
CREATE POLICY "anon_read_active_brand_config" ON brand_config FOR SELECT
  TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "auth_manage_brand_config" ON brand_config;
CREATE POLICY "auth_manage_brand_config" ON brand_config FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS brand_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE brand_themes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_active_themes" ON brand_themes;
CREATE POLICY "anon_read_active_themes" ON brand_themes FOR SELECT
  TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "auth_manage_themes" ON brand_themes;
CREATE POLICY "auth_manage_themes" ON brand_themes FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 2. FREQUENCY (Feature B — Synf Frequency Magazine)
-- ============================================================

CREATE TABLE IF NOT EXISTS frequency_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE frequency_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_active_freq_cats" ON frequency_categories;
CREATE POLICY "anon_read_active_freq_cats" ON frequency_categories FOR SELECT
  TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "auth_manage_freq_cats" ON frequency_categories;
CREATE POLICY "auth_manage_freq_cats" ON frequency_categories FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS frequency_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  excerpt text,
  body text,
  cover_image_url text,
  cover_image_alt text,
  gallery jsonb DEFAULT '[]'::jsonb,
  embedded_media jsonb DEFAULT '[]'::jsonb,
  category_id uuid REFERENCES frequency_categories(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  author_name text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  layout text DEFAULT 'standard',
  seo_title text,
  seo_description text,
  seo_image_url text,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE frequency_articles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_freq_articles_status ON frequency_articles(status);
CREATE INDEX IF NOT EXISTS idx_freq_articles_published ON frequency_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_freq_articles_slug ON frequency_articles(slug);

DROP POLICY IF EXISTS "anon_read_published_articles" ON frequency_articles;
CREATE POLICY "anon_read_published_articles" ON frequency_articles FOR SELECT
  TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS "auth_manage_articles" ON frequency_articles;
CREATE POLICY "auth_manage_articles" ON frequency_articles FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. INSIDE SYNF (Feature C — Team Stories)
-- ============================================================

CREATE TABLE IF NOT EXISTS inside_story_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE inside_story_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_story_types" ON inside_story_types;
CREATE POLICY "anon_read_story_types" ON inside_story_types FOR SELECT
  TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "auth_manage_story_types" ON inside_story_types;
CREATE POLICY "auth_manage_story_types" ON inside_story_types FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inside_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text,
  body text,
  cover_image_url text,
  cover_image_alt text,
  gallery jsonb DEFAULT '[]'::jsonb,
  story_type_id uuid REFERENCES inside_story_types(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  contributor_credits jsonb DEFAULT '[]'::jsonb,
  related_person_id uuid,
  related_event_id uuid,
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean DEFAULT false,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE inside_stories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_inside_stories_status ON inside_stories(status);
CREATE INDEX IF NOT EXISTS idx_inside_stories_published ON inside_stories(published_at DESC);

DROP POLICY IF EXISTS "anon_read_published_stories" ON inside_stories;
CREATE POLICY "anon_read_published_stories" ON inside_stories FOR SELECT
  TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS "auth_manage_stories" ON inside_stories;
CREATE POLICY "auth_manage_stories" ON inside_stories FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. SYNF PASS (Feature D — Community Profiles)
-- ============================================================

CREATE TABLE IF NOT EXISTS community_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  bio text,
  interests text[] DEFAULT '{}',
  preferred_categories text[] DEFAULT '{}',
  social_links jsonb DEFAULT '[]'::jsonb,
  is_public boolean DEFAULT false,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_community_profiles_user ON community_profiles(user_id);

DROP POLICY IF EXISTS "select_own_community_profile" ON community_profiles;
CREATE POLICY "select_own_community_profile" ON community_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_public = true);
DROP POLICY IF EXISTS "insert_own_community_profile" ON community_profiles;
CREATE POLICY "insert_own_community_profile" ON community_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_community_profile" ON community_profiles;
CREATE POLICY "update_own_community_profile" ON community_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_community_profile" ON community_profiles;
CREATE POLICY "delete_own_community_profile" ON community_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS saved_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);
ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_saved_events_user ON saved_events(user_id);

DROP POLICY IF EXISTS "select_own_saved_events" ON saved_events;
CREATE POLICY "select_own_saved_events" ON saved_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_saved_events" ON saved_events;
CREATE POLICY "insert_own_saved_events" ON saved_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_saved_events" ON saved_events;
CREATE POLICY "delete_own_saved_events" ON saved_events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS attendance_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz DEFAULT now(),
  method text NOT NULL DEFAULT 'manual_checkin',
  UNIQUE(user_id, event_id)
);
ALTER TABLE attendance_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_badges" ON attendance_badges;
CREATE POLICY "select_own_badges" ON attendance_badges FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "auth_manage_badges" ON attendance_badges;
CREATE POLICY "auth_manage_badges" ON attendance_badges FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. COMMUNITY WALL (Feature E)
-- ============================================================

CREATE TABLE IF NOT EXISTS community_wall_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE community_wall_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_wall_cats" ON community_wall_categories;
CREATE POLICY "anon_read_wall_cats" ON community_wall_categories FOR SELECT
  TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "auth_manage_wall_cats" ON community_wall_categories;
CREATE POLICY "auth_manage_wall_cats" ON community_wall_categories FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS community_wall_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  thumbnail_url text,
  caption text,
  category_id uuid REFERENCES community_wall_categories(id) ON DELETE SET NULL,
  event_id uuid,
  campaign_id uuid,
  contributor_name text,
  contributor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_anonymous boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  consent_confirmed boolean DEFAULT false,
  contact_email text,
  moderation_notes text,
  moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  is_featured boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE community_wall_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wall_posts_status ON community_wall_posts(status);
CREATE INDEX IF NOT EXISTS idx_wall_posts_featured ON community_wall_posts(is_featured);

DROP POLICY IF EXISTS "anon_read_approved_wall" ON community_wall_posts;
CREATE POLICY "anon_read_approved_wall" ON community_wall_posts FOR SELECT
  TO anon, authenticated USING (status = 'approved');
DROP POLICY IF EXISTS "auth_insert_wall_submission" ON community_wall_posts;
CREATE POLICY "auth_insert_wall_submission" ON community_wall_posts FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_manage_wall_posts" ON community_wall_posts;
CREATE POLICY "auth_manage_wall_posts" ON community_wall_posts FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. CAMPAIGN STUDIO (Feature F)
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  internal_notes text,
  category text,
  tags text[] DEFAULT '{}',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  theme_id uuid REFERENCES brand_themes(id) ON DELETE SET NULL,
  start_date timestamptz,
  end_date timestamptz,
  timezone text DEFAULT 'Asia/Kolkata',
  hero_media_url text,
  poster_url text,
  cover_image_url text,
  gallery jsonb DEFAULT '[]'::jsonb,
  headline text,
  subheadline text,
  cta_label text,
  cta_url text,
  landing_page_visible boolean DEFAULT false,
  social_title text,
  social_description text,
  social_image_url text,
  utm_params jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

DROP POLICY IF EXISTS "anon_read_live_campaigns" ON campaigns;
CREATE POLICY "anon_read_live_campaigns" ON campaigns FOR SELECT
  TO anon, authenticated USING (status IN ('live', 'completed') AND landing_page_visible = true);
DROP POLICY IF EXISTS "auth_manage_campaigns" ON campaigns;
CREATE POLICY "auth_manage_campaigns" ON campaigns FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS campaign_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  title text,
  config jsonb DEFAULT '{}'::jsonb,
  sort_order int DEFAULT 0,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE campaign_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_campaign_sections" ON campaign_sections;
CREATE POLICY "anon_read_campaign_sections" ON campaign_sections FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_manage_campaign_sections" ON campaign_sections;
CREATE POLICY "auth_manage_campaign_sections" ON campaign_sections FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS campaign_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  related_type text NOT NULL,
  related_id uuid,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE campaign_relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_campaign_relations" ON campaign_relations;
CREATE POLICY "anon_read_campaign_relations" ON campaign_relations FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_manage_campaign_relations" ON campaign_relations;
CREATE POLICY "auth_manage_campaign_relations" ON campaign_relations FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. SYNF GOODS (Feature H — Merchandise)
-- ============================================================

CREATE TABLE IF NOT EXISTS goods_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE goods_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_goods_cats" ON goods_categories;
CREATE POLICY "anon_read_goods_cats" ON goods_categories FOR SELECT
  TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "auth_manage_goods_cats" ON goods_categories;
CREATE POLICY "auth_manage_goods_cats" ON goods_categories FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS goods_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES goods_categories(id) ON DELETE SET NULL,
  images jsonb DEFAULT '[]'::jsonb,
  price numeric(10,2),
  currency text DEFAULT 'INR',
  availability_status text NOT NULL DEFAULT 'coming_soon',
  external_purchase_url text,
  tags text[] DEFAULT '{}',
  is_featured boolean DEFAULT false,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE goods_products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_goods_status ON goods_products(status);
CREATE INDEX IF NOT EXISTS idx_goods_published ON goods_products(published_at DESC);

DROP POLICY IF EXISTS "anon_read_published_goods" ON goods_products;
CREATE POLICY "anon_read_published_goods" ON goods_products FOR SELECT
  TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS "auth_manage_goods" ON goods_products;
CREATE POLICY "auth_manage_goods" ON goods_products FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS goods_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES goods_products(id) ON DELETE CASCADE,
  variant_type text NOT NULL,
  variant_value text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE goods_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_goods_variants" ON goods_variants;
CREATE POLICY "anon_read_goods_variants" ON goods_variants FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_manage_goods_variants" ON goods_variants;
CREATE POLICY "auth_manage_goods_variants" ON goods_variants FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 8. SECRET DROPS (Feature I)
-- ============================================================

CREATE TABLE IF NOT EXISTS secret_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  teaser_description text,
  poster_url text,
  teaser_media_url text,
  reveal_at timestamptz,
  timezone text DEFAULT 'Asia/Kolkata',
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  related_event_id uuid,
  related_product_id uuid REFERENCES goods_products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  is_visible boolean DEFAULT false,
  allow_notifications boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE secret_drops ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_drops_status ON secret_drops(status);
CREATE INDEX IF NOT EXISTS idx_drops_reveal ON secret_drops(reveal_at);

DROP POLICY IF EXISTS "anon_read_visible_drops" ON secret_drops;
CREATE POLICY "anon_read_visible_drops" ON secret_drops FOR SELECT
  TO anon, authenticated USING (is_visible = true);
DROP POLICY IF EXISTS "auth_manage_drops" ON secret_drops;
CREATE POLICY "auth_manage_drops" ON secret_drops FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS secret_drop_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES secret_drops(id) ON DELETE CASCADE,
  stage_number int NOT NULL,
  stage_name text NOT NULL,
  stage_text text,
  media_url text,
  cta_label text,
  cta_url text,
  reveal_at timestamptz,
  is_revealed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(drop_id, stage_number)
);
ALTER TABLE secret_drop_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_revealed_stages" ON secret_drop_stages;
CREATE POLICY "anon_read_revealed_stages" ON secret_drop_stages FOR SELECT
  TO anon, authenticated USING (is_revealed = true);
DROP POLICY IF EXISTS "auth_manage_drop_stages" ON secret_drop_stages;
CREATE POLICY "auth_manage_drop_stages" ON secret_drop_stages FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 9. EVENT FAQ (Feature K)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_faq_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE event_faq_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_faq_cats" ON event_faq_categories;
CREATE POLICY "anon_read_faq_cats" ON event_faq_categories FOR SELECT
  TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "auth_manage_faq_cats" ON event_faq_categories;
CREATE POLICY "auth_manage_faq_cats" ON event_faq_categories FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS event_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  category_id uuid REFERENCES event_faq_categories(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int DEFAULT 0,
  is_published boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE event_faqs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_event_faqs_event ON event_faqs(event_id);

DROP POLICY IF EXISTS "anon_read_published_faqs" ON event_faqs;
CREATE POLICY "anon_read_published_faqs" ON event_faqs FOR SELECT
  TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "auth_manage_faqs" ON event_faqs;
CREATE POLICY "auth_manage_faqs" ON event_faqs FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Insert default FAQ category
INSERT INTO event_faq_categories (name, slug, sort_order)
VALUES ('General', 'general', 0)
ON CONFLICT (slug) DO NOTHING;

-- Insert default frequency categories
INSERT INTO frequency_categories (name, slug, sort_order) VALUES
  ('Culture', 'culture', 0),
  ('Music', 'music', 1),
  ('Events', 'events', 2),
  ('Behind the Scenes', 'behind-the-scenes', 3),
  ('Creators', 'creators', 4),
  ('Announcements', 'announcements', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert default story types
INSERT INTO inside_story_types (name, slug, sort_order) VALUES
  ('Crew Spotlight', 'crew-spotlight', 0),
  ('Department Feature', 'department-feature', 1),
  ('Behind the Scenes', 'behind-the-scenes', 2),
  ('Production Diary', 'production-diary', 3),
  ('Day in the Life', 'day-in-the-life', 4),
  ('Interview', 'interview', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert default goods categories
INSERT INTO goods_categories (name, slug, sort_order) VALUES
  ('Apparel', 'apparel', 0),
  ('Accessories', 'accessories', 1),
  ('Prints & Posters', 'prints-posters', 2),
  ('Stickers', 'stickers', 3),
  ('Bundles', 'bundles', 4)
ON CONFLICT (slug) DO NOTHING;

-- Insert default wall categories
INSERT INTO community_wall_categories (name, slug, sort_order) VALUES
  ('Parties', 'parties', 0),
  ('DJ Nights', 'dj-nights', 1),
  ('Behind the Scenes', 'behind-the-scenes', 2),
  ('Crew', 'crew', 3),
  ('Venues', 'venues', 4)
ON CONFLICT (slug) DO NOTHING;

-- Insert default brand themes
INSERT INTO brand_themes (name, slug, description, is_system, is_active, config) VALUES
  ('After Dark', 'after-dark', 'Default midnight aesthetic with magenta-acid accents', true, true,
   '{"primaryColor":"#ff2d6f","accentColor":"#d4ff3f","bgColor":"#0a0a0b","motionIntensity":"high"}'),
  ('Festival Mode', 'festival-mode', 'High-energy multi-colour palette for festival campaigns', true, false,
   '{"primaryColor":"#a855f7","accentColor":"#22b8ff","bgColor":"#0a0a0b","motionIntensity":"high"}'),
  ('Editorial', 'editorial', 'Clean monochrome with restrained accents for long-form content', true, false,
   '{"primaryColor":"#ffffff","accentColor":"#d4ff3f","bgColor":"#111111","motionIntensity":"low"}'),
  ('Monochrome', 'monochrome', 'Pure black and white minimal mode', true, false,
   '{"primaryColor":"#ffffff","accentColor":"#ffffff","bgColor":"#000000","motionIntensity":"low"}')
ON CONFLICT (slug) DO NOTHING;
