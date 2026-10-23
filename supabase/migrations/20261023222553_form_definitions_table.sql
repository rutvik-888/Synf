/*
# Custom Form Definitions for Contact & Collaboration Forms

1. New table: `form_definitions`
   - Stores customizable form fields for the public Contact and Collaboration forms
   - Each row is keyed by `form_key` ('contact' or 'collaboration')
   - Stores a jsonb `fields` array matching the existing FormField type used by recruitment_forms
   - Versioned like recruitment_forms — only one active version per form_key at a time
   - Also stores `title`, `intro`, `consent_text`, and `success_message` per form

2. Security
   - RLS enabled
   - anon+authenticated SELECT (public pages need to read the active form to render)
   - authenticated-only INSERT/UPDATE/DELETE (admin management)
*/

CREATE TABLE IF NOT EXISTS form_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  title text NOT NULL,
  intro text,
  consent_text text NOT NULL DEFAULT 'I agree to be contacted regarding my enquiry. My data will be stored and used per the Privacy Policy.',
  success_message text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_definitions_key_active ON form_definitions(form_key) WHERE is_active = true;

ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON form_definitions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON form_definitions TO authenticated;

DROP POLICY IF EXISTS "anon_read_active_form_defs" ON form_definitions;
CREATE POLICY "anon_read_active_form_defs"
  ON form_definitions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_form_defs" ON form_definitions;
CREATE POLICY "auth_insert_form_defs"
  ON form_definitions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_form_defs" ON form_definitions;
CREATE POLICY "auth_update_form_defs"
  ON form_definitions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_form_defs" ON form_definitions;
CREATE POLICY "auth_delete_form_defs"
  ON form_definitions FOR DELETE
  TO authenticated USING (true);

-- Seed default contact form definition
INSERT INTO form_definitions (form_key, version, is_active, title, consent_text, success_message, fields, published_at)
SELECT 'contact', 1, true, 'Contact Us',
  'I agree to be contacted regarding my enquiry. My data will be stored and used per the Privacy Policy.',
  'Your message has been received. Our team will review it and reach out if a response is needed.',
  '[
    {"id":"f_name","type":"short_text","label":"Full name","required":true,"placeholder":"Your full name"},
    {"id":"f_email","type":"email","label":"Email address","required":true,"placeholder":"you@example.com"},
    {"id":"f_category","type":"dropdown","label":"Enquiry category","required":true,"options":["General","Events","Partnerships","Press","Careers","Feedback"]},
    {"id":"f_subject","type":"short_text","label":"Subject","required":true,"placeholder":"Brief summary"},
    {"id":"f_message","type":"long_text","label":"Message","required":true,"placeholder":"Tell us what''s on your mind…"},
    {"id":"f_phone","type":"phone","label":"Phone","required":false,"placeholder":"+91…"},
    {"id":"f_org","type":"short_text","label":"Organization / Brand","required":false,"placeholder":"If applicable"},
    {"id":"f_links","type":"url","label":"Website / Portfolio","required":false,"placeholder":"https://…"}
  ]'::jsonb,
  now()
WHERE NOT EXISTS (SELECT 1 FROM form_definitions WHERE form_key = 'contact' AND is_active = true);

-- Seed default collaboration form definition
INSERT INTO form_definitions (form_key, version, is_active, title, consent_text, success_message, fields, published_at)
SELECT 'collaboration', 1, true, 'Collaborate',
  'I agree to be contacted about this collaboration enquiry. My data will be stored and used per the Privacy Policy.',
  'Thanks for reaching out. Our team will get back to you at the email you provided.',
  '[
    {"id":"f_name","type":"short_text","label":"Full name","required":true,"placeholder":"Your full name"},
    {"id":"f_email","type":"email","label":"Email","required":true,"placeholder":"you@example.com"},
    {"id":"f_phone","type":"phone","label":"Phone","required":false},
    {"id":"f_brand","type":"short_text","label":"Brand / organisation","required":false},
    {"id":"f_category","type":"dropdown","label":"Category","required":false,"options":["Brand / Sponsor","Venue / Hospitality","DJ / Artist","Promoter","Photographer / Videographer","Creative Partner","Production / Logistics","Other"]},
    {"id":"f_event","type":"short_text","label":"Event / concept name","required":false},
    {"id":"f_date","type":"date","label":"Preferred date","required":false},
    {"id":"f_city","type":"short_text","label":"Venue / city","required":false},
    {"id":"f_budget","type":"short_text","label":"Budget range","required":false,"placeholder":"e.g. ₹50k–₹1L"},
    {"id":"f_audience","type":"short_text","label":"Audience size","required":false,"placeholder":"e.g. 300–500"},
    {"id":"f_message","type":"long_text","label":"Message","required":true,"placeholder":"Tell us about your idea…"},
    {"id":"f_links","type":"url","label":"Relevant links","required":false,"placeholder":"Website, socials, past work…"}
  ]'::jsonb,
  now()
WHERE NOT EXISTS (SELECT 1 FROM form_definitions WHERE form_key = 'collaboration' AND is_active = true);