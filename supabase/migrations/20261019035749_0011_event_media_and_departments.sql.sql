/*
# Event media storage bucket + extended event_media + expanded departments

## 1. Storage bucket `event-media` (public)
For event cover images, gallery images, and uploaded videos.
- Public read (anyone can view published event media).
- Staff write (upload, replace, delete).

## 2. event_media extensions
Adds columns to support uploads vs URLs, video metadata, posters:
- source_type: 'upload' | 'url' | 'embed'
- poster_url: thumbnail/poster image for videos
- mime_type, file_size, original_filename
- width, height (for images)
- duration_seconds (for videos)
- title (optional display title)

## 3. Departments expansion
Adds group_label column to group departments in the dropdown.
Inserts the full event-industry department list.
Preserves existing departments by updating their group_label.
*/
-- ============================================================
-- 1. event-media storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-media', 'event-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_event_media_bucket" ON storage.objects;
CREATE POLICY "public_read_event_media_bucket"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'event-media');

DROP POLICY IF EXISTS "staff_insert_event_media_bucket" ON storage.objects;
CREATE POLICY "staff_insert_event_media_bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-media');

DROP POLICY IF EXISTS "staff_update_event_media_bucket" ON storage.objects;
CREATE POLICY "staff_update_event_media_bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-media');

DROP POLICY IF EXISTS "staff_delete_event_media_bucket" ON storage.objects;
CREATE POLICY "staff_delete_event_media_bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-media');

-- ============================================================
-- 2. event_media column extensions
-- ============================================================
ALTER TABLE public.event_media
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'url',
  ADD COLUMN IF NOT EXISTS poster_url text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS original_filename text,
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric,
  ADD COLUMN IF NOT EXISTS title text;

-- ============================================================
-- 3. Departments expansion
-- ============================================================
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS group_label text NOT NULL DEFAULT 'General';

-- Map existing departments to appropriate groups
UPDATE public.departments SET group_label = 'Events & Production' WHERE id = 'event_operations';
UPDATE public.departments SET group_label = 'Events & Production' WHERE id = 'logistics';
UPDATE public.departments SET group_label = 'Creative & Media' WHERE id = 'creative';
UPDATE public.departments SET group_label = 'Creative & Media' WHERE id = 'photo_video';
UPDATE public.departments SET group_label = 'Creative & Media' WHERE id = 'marketing';
UPDATE public.departments SET group_label = 'Events & Production' WHERE id = 'artist_relations';
UPDATE public.departments SET group_label = 'Business & Partnerships' WHERE id = 'partnerships';
UPDATE public.departments SET group_label = 'General' WHERE id = 'general';

-- Insert the expanded department list (idempotent — skip if name already exists)
-- Leadership & Management
INSERT INTO public.departments (id, name, group_label, sort_order, is_active) VALUES
  ('executive_leadership', 'Executive Leadership', 'Leadership & Management', 10, true),
  ('operations_admin', 'Operations & Administration', 'Leadership & Management', 11, true),
  ('project_management', 'Project Management', 'Leadership & Management', 12, true),
  ('strategy_planning', 'Strategy & Planning', 'Leadership & Management', 13, true),
  ('hr_recruitment', 'Human Resources & Recruitment', 'Leadership & Management', 14, true),
  ('legal_compliance', 'Legal & Compliance', 'Leadership & Management', 15, true)
ON CONFLICT (id) DO UPDATE SET group_label = EXCLUDED.group_label, name = EXCLUDED.name;

-- Events & Production
INSERT INTO public.departments (id, name, group_label, sort_order, is_active) VALUES
  ('event_management', 'Event Management', 'Events & Production', 20, true),
  ('event_production', 'Event Production', 'Events & Production', 21, true),
  ('stage_management', 'Stage Management', 'Events & Production', 22, true),
  ('technical_production', 'Technical Production', 'Events & Production', 23, true),
  ('audio_engineering', 'Audio Engineering', 'Events & Production', 24, true),
  ('lighting_visual', 'Lighting & Visual Production', 'Events & Production', 25, true),
  ('av_projection', 'AV & Projection', 'Events & Production', 26, true),
  ('venue_site_ops', 'Venue & Site Operations', 'Events & Production', 27, true),
  ('event_logistics', 'Event Logistics', 'Events & Production', 28, true),
  ('health_safety_security', 'Health, Safety & Security', 'Events & Production', 29, true),
  ('artist_talent_mgmt', 'Artist & Talent Management', 'Events & Production', 30, true),
  ('guest_relations', 'Guest Relations & Hospitality', 'Events & Production', 31, true),
  ('registration_guest_exp', 'Registration & Guest Experience', 'Events & Production', 32, true)
ON CONFLICT (id) DO UPDATE SET group_label = EXCLUDED.group_label, name = EXCLUDED.name;

-- Creative & Media
INSERT INTO public.departments (id, name, group_label, sort_order, is_active) VALUES
  ('creative_direction', 'Creative Direction', 'Creative & Media', 40, true),
  ('graphic_design', 'Graphic Design', 'Creative & Media', 41, true),
  ('branding_visual', 'Branding & Visual Identity', 'Creative & Media', 42, true),
  ('photography', 'Photography', 'Creative & Media', 43, true),
  ('videography', 'Videography', 'Creative & Media', 44, true),
  ('video_editing', 'Video Editing & Post-Production', 'Creative & Media', 45, true),
  ('motion_graphics', 'Motion Graphics & Animation', 'Creative & Media', 46, true),
  ('content_creation', 'Content Creation', 'Creative & Media', 47, true),
  ('social_media', 'Social Media', 'Creative & Media', 48, true),
  ('marketing_promotions', 'Marketing & Promotions', 'Creative & Media', 49, true),
  ('pr_communications', 'Public Relations & Communications', 'Creative & Media', 50, true),
  ('copywriting_editorial', 'Copywriting & Editorial', 'Creative & Media', 51, true),
  ('web_design_dev', 'Web Design & Development', 'Creative & Media', 52, true),
  ('digital_interactive', 'Digital & Interactive Experiences', 'Creative & Media', 53, true)
ON CONFLICT (id) DO UPDATE SET group_label = EXCLUDED.group_label, name = EXCLUDED.name;

-- Business & Partnerships
INSERT INTO public.departments (id, name, group_label, sort_order, is_active) VALUES
  ('partnerships_sponsorships', 'Partnerships & Sponsorships', 'Business & Partnerships', 60, true),
  ('collaborations_outreach', 'Collaborations & Outreach', 'Business & Partnerships', 61, true),
  ('sales_bizdev', 'Sales & Business Development', 'Business & Partnerships', 62, true),
  ('client_relations', 'Client Relations', 'Business & Partnerships', 63, true),
  ('finance_budgeting', 'Finance & Budgeting', 'Business & Partnerships', 64, true),
  ('procurement_vendor', 'Procurement & Vendor Management', 'Business & Partnerships', 65, true)
ON CONFLICT (id) DO UPDATE SET group_label = EXCLUDED.group_label, name = EXCLUDED.name;

-- Community & Support
INSERT INTO public.departments (id, name, group_label, sort_order, is_active) VALUES
  ('community_management', 'Community Management', 'Community & Support', 70, true),
  ('campus_relations', 'Campus Relations', 'Community & Support', 71, true),
  ('volunteer_coordination', 'Volunteer Coordination', 'Community & Support', 72, true),
  ('recruitment_onboarding', 'Recruitment & Onboarding', 'Community & Support', 73, true),
  ('research_insights', 'Research & Insights', 'Community & Support', 74, true),
  ('general_support', 'General Support', 'Community & Support', 75, true),
  ('other', 'Other', 'Community & Support', 99, true)
ON CONFLICT (id) DO UPDATE SET group_label = EXCLUDED.group_label, name = EXCLUDED.name;

-- Re-sort existing departments that are kept
UPDATE public.departments SET sort_order = 1 WHERE id = 'event_operations';
UPDATE public.departments SET sort_order = 7 WHERE id = 'logistics';
UPDATE public.departments SET sort_order = 3 WHERE id = 'creative';
UPDATE public.departments SET sort_order = 4 WHERE id = 'photo_video';
UPDATE public.departments SET sort_order = 48 WHERE id = 'marketing';
UPDATE public.departments SET sort_order = 30 WHERE id = 'artist_relations';
UPDATE public.departments SET sort_order = 60 WHERE id = 'partnerships';
UPDATE public.departments SET sort_order = 99 WHERE id = 'general';
