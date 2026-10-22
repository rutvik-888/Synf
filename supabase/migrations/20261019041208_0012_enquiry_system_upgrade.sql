/*
# Enquiry System Upgrade — Reference Numbers, Categories, Priorities, Assignment, Notes, Settings

Extends the existing enquiries table. Creates enquiry_categories, enquiry_notes, enquiry_activity
tables and a reference sequence RPC. Adds enquiry email templates and contact settings config.
*/

-- ============================================================
-- 1. Extend enquiries table (additive only)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enquiries' AND column_name='reference_number') THEN
    ALTER TABLE public.enquiries ADD COLUMN reference_number text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enquiries' AND column_name='subject') THEN
    ALTER TABLE public.enquiries ADD COLUMN subject text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enquiries' AND column_name='priority') THEN
    ALTER TABLE public.enquiries ADD COLUMN priority text NOT NULL DEFAULT 'normal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enquiries' AND column_name='assigned_to') THEN
    ALTER TABLE public.enquiries ADD COLUMN assigned_to uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enquiries' AND column_name='organization') THEN
    ALTER TABLE public.enquiries ADD COLUMN organization text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enquiries' AND column_name='preferred_contact_method') THEN
    ALTER TABLE public.enquiries ADD COLUMN preferred_contact_method text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enquiries' AND column_name='read_at') THEN
    ALTER TABLE public.enquiries ADD COLUMN read_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enquiries' AND column_name='last_updated_at') THEN
    ALTER TABLE public.enquiries ADD COLUMN last_updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enquiries' AND column_name='category_id') THEN
    ALTER TABLE public.enquiries ADD COLUMN category_id uuid;
  END IF;
END $$;

-- ============================================================
-- 2. Enquiry Categories (create BEFORE FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enquiry_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon_name text DEFAULT 'MessageSquare',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enquiry_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_enquiry_categories" ON public.enquiry_categories;
CREATE POLICY "public_read_enquiry_categories"
  ON public.enquiry_categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_enquiry_categories" ON public.enquiry_categories;
CREATE POLICY "staff_insert_enquiry_categories"
  ON public.enquiry_categories FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_update_enquiry_categories" ON public.enquiry_categories;
CREATE POLICY "staff_update_enquiry_categories"
  ON public.enquiry_categories FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_delete_enquiry_categories" ON public.enquiry_categories;
CREATE POLICY "staff_delete_enquiry_categories"
  ON public.enquiry_categories FOR DELETE
  TO authenticated USING (public.is_admin_or_owner());

INSERT INTO public.enquiry_categories (display_name, slug, description, icon_name, sort_order) VALUES
  ('General Enquiry', 'general', 'General questions and inquiries', 'MessageSquare', 1),
  ('Event Enquiry', 'event', 'Questions about events, tickets, or experiences', 'Calendar', 2),
  ('Brand Partnership', 'brand', 'Sponsorship and brand collaboration opportunities', 'Handshake', 3),
  ('Media & Press', 'media', 'Press, media, and interview requests', 'Newspaper', 4),
  ('Careers & Recruitment', 'careers', 'Joining the team and recruitment', 'Briefcase', 5),
  ('Technical Issue', 'technical', 'Website or technical problems', 'Wrench', 6),
  ('Feedback & Suggestion', 'feedback', 'Feedback and suggestions', 'Lightbulb', 7),
  ('Complaint', 'complaint', 'Formal complaints', 'AlertTriangle', 8),
  ('Other', 'other', 'Anything else', 'Mail', 9)
ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description, updated_at = now();

-- Now add FKs (categories table exists now)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='enquiries_assigned_to_fkey' AND table_name='enquiries') THEN
    ALTER TABLE public.enquiries ADD CONSTRAINT enquiries_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES public.team_member_profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='enquiries_category_id_fkey' AND table_name='enquiries') THEN
    ALTER TABLE public.enquiries ADD CONSTRAINT enquiries_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.enquiry_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 3. Enquiry Notes (internal, never public)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enquiry_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  author_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enquiry_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_enquiry_notes" ON public.enquiry_notes;
CREATE POLICY "staff_read_enquiry_notes"
  ON public.enquiry_notes FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "staff_insert_enquiry_notes" ON public.enquiry_notes;
CREATE POLICY "staff_insert_enquiry_notes"
  ON public.enquiry_notes FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff_delete_enquiry_notes" ON public.enquiry_notes;
CREATE POLICY "staff_delete_enquiry_notes"
  ON public.enquiry_notes FOR DELETE TO authenticated USING (public.is_staff());

CREATE INDEX IF NOT EXISTS enquiry_notes_enquiry_idx ON public.enquiry_notes (enquiry_id, created_at);

-- ============================================================
-- 4. Enquiry Activity Timeline
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enquiry_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enquiry_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_enquiry_activity" ON public.enquiry_activity;
CREATE POLICY "staff_read_enquiry_activity"
  ON public.enquiry_activity FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "staff_insert_enquiry_activity" ON public.enquiry_activity;
CREATE POLICY "staff_insert_enquiry_activity"
  ON public.enquiry_activity FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS enquiry_activity_enquiry_idx ON public.enquiry_activity (enquiry_id, created_at);

-- ============================================================
-- 5. Reference Number Sequence + RPC
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enquiry_reference_seq (
  id integer PRIMARY KEY DEFAULT 1,
  counter integer NOT NULL DEFAULT 0
);

INSERT INTO public.enquiry_reference_seq (id, counter) VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.generate_enquiry_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val integer;
  ref text;
BEGIN
  UPDATE public.enquiry_reference_seq SET counter = counter + 1 WHERE id = 1 RETURNING counter INTO next_val;
  ref := '#SYNF-CON-' || lpad(next_val::text, 6, '0');
  RETURN ref;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_enquiry_reference() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_enquiry_reference() TO authenticated;

-- ============================================================
-- 6. Email Templates for Enquiries
-- ============================================================
INSERT INTO public.email_templates (key, subject, body) VALUES
  ('enquiry_acknowledgement',
   'We received your message — {{reference_number}}',
   'Hi {{visitor_name}},

Thank you for reaching out to Team Synf. We''ve received your enquiry and it''s been logged in our system.

Reference: {{reference_number}}
Category: {{category}}
Subject: {{subject}}

Our team will review your message and get back to you if a response is appropriate. Please keep your reference number handy for any future correspondence about this enquiry.

Visit us at {{website_url}}

— Team Synf'),
  ('enquiry_internal_notify',
   'New enquiry: {{reference_number}} — {{subject}}',
   'A new enquiry has been received.

Reference: {{reference_number}}
From: {{visitor_name}} <{{visitor_email}}>
Category: {{category}}
Subject: {{subject}}

Message:
{{message_preview}}

Submitted: {{submitted_at}}

View in admin panel → {{admin_link}}

— Team Synf System')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. Contact Settings (stored in site_content)
-- ============================================================
INSERT INTO public.site_content (slug, title, body, data, is_public)
VALUES (
  'contact_settings',
  'Contact Settings',
  NULL,
  jsonb_build_object(
    'hero_heading', 'Let''s Start a Conversation.',
    'hero_subheading', 'Questions, press, partnerships, feedback — whatever it is, we''re listening. Reach out and let''s see where it goes.',
    'public_email', 'synf.c@com.gh',
    'show_public_email', true,
    'internal_recipient', 'synf.c@com.gh',
    'acknowledgement_email_enabled', true,
    'internal_notification_enabled', true,
    'attachment_enabled', false,
    'max_attachment_size_mb', 10,
    'allowed_attachment_types', ARRAY['pdf','jpg','jpeg','png','webp','doc','docx'],
    'show_phone_field', true,
    'show_organization_field', true,
    'show_links_field', true,
    'show_preferred_contact', true,
    'success_message', 'Your message has been received. Our team will review it and reach out if a response is needed.',
    'response_time_text', '',
    'show_response_time', false
  ),
  true
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 8. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS enquiries_reference_idx ON public.enquiries (reference_number);
CREATE INDEX IF NOT EXISTS enquiries_priority_idx ON public.enquiries (priority);
CREATE INDEX IF NOT EXISTS enquiries_assigned_idx ON public.enquiries (assigned_to);
CREATE INDEX IF NOT EXISTS enquiries_category_idx ON public.enquiries (category_id);
CREATE INDEX IF NOT EXISTS enquiries_updated_idx ON public.enquiries (last_updated_at DESC);
