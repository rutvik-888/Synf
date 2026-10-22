/*
# Recruitment system: job postings, sequential application IDs, interviews, status history

## Changes
1. New table: job_postings — published/paused/closed/archived job listings with form config
2. New sequence: application_seq — concurrency-safe counter for #SYNF-APP-000001 IDs
3. Alter applications table — add application_code, job_id, reviewer notes, reviewer assignment
4. New table: interviews — scheduling with date/time/timezone/link/instructions
5. New table: application_status_history — audit trail of status changes
6. Seed default email templates for recruitment workflow
7. RLS on all new tables
*/

-- ========== JOB POSTINGS ==========
CREATE TABLE IF NOT EXISTS public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  department text NOT NULL DEFAULT 'General',
  description text,
  responsibilities text,
  required_skills text[],
  preferred_skills text[],
  eligibility text,
  num_openings int,
  arrangement text NOT NULL DEFAULT 'volunteer' CHECK (arrangement IN ('volunteer','event_based','internship','part_time','contract','other')),
  application_open date NOT NULL DEFAULT CURRENT_DATE,
  application_close date,
  form_fields jsonb NOT NULL DEFAULT '[]',
  requires_portfolio boolean NOT NULL DEFAULT false,
  requires_cv boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','paused','closed','archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Public can read only published, open jobs
DROP POLICY IF EXISTS "public_read_open_jobs" ON public.job_postings;
CREATE POLICY "public_read_open_jobs" ON public.job_postings
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Staff can read all jobs
DROP POLICY IF EXISTS "staff_read_jobs" ON public.job_postings;
CREATE POLICY "staff_read_jobs" ON public.job_postings
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- Recruitment managers + admin + owner can write
DROP POLICY IF EXISTS "recruitment_write_jobs" ON public.job_postings;
CREATE POLICY "recruitment_write_jobs" ON public.job_postings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_owner() OR public.user_role() = 'recruitment_manager');

DROP POLICY IF EXISTS "recruitment_update_jobs" ON public.job_postings;
CREATE POLICY "recruitment_update_jobs" ON public.job_postings
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner() OR public.user_role() = 'recruitment_manager')
  WITH CHECK (public.is_admin_or_owner() OR public.user_role() = 'recruitment_manager');

DROP POLICY IF EXISTS "admin_delete_jobs" ON public.job_postings;
CREATE POLICY "admin_delete_jobs" ON public.job_postings
  FOR DELETE TO authenticated
  USING (public.is_admin_or_owner());

CREATE INDEX IF NOT EXISTS job_postings_status_idx ON public.job_postings (status, application_close);

-- ========== APPLICATION SEQUENCE ==========
-- Concurrency-safe sequence for #SYNF-APP-000001 format
CREATE SEQUENCE IF NOT EXISTS public.application_seq START 1 INCREMENT 1 NO CYCLE;

-- ========== ALTER APPLICATIONS TABLE ==========
-- Add application_code, job_id, reviewer assignment, rejection reason
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS application_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.job_postings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_reviewer uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_at timestamptz;

-- Update status enum to include 'approved' and 'interview_invited'
-- (can't change CHECK constraint without ALTER; use new values)
-- We'll allow the new values by dropping and recreating the constraint
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('submitted','under_review','approved','interview_invited','rejected','withdrawn'));

-- Update existing rows: 'new' -> 'submitted', 'reviewing' -> 'under_review', etc.
UPDATE public.applications SET status = 'submitted' WHERE status = 'new';
UPDATE public.applications SET status = 'under_review' WHERE status = 'reviewing';
UPDATE public.applications SET status = 'approved' WHERE status = 'shortlisted';
UPDATE public.applications SET status = 'interview_invited' WHERE status = 'interview';
UPDATE public.applications SET status = 'approved' WHERE status = 'selected';

-- Index on application_code for lookups
CREATE INDEX IF NOT EXISTS applications_code_idx ON public.applications (application_code);
CREATE INDEX IF NOT EXISTS applications_job_idx ON public.applications (job_id);
CREATE INDEX IF NOT EXISTS applications_reviewer_idx ON public.applications (assigned_reviewer);

-- Allow event_manager to read applications (for staffing)
DROP POLICY IF EXISTS "recruitment_read_applications" ON public.applications;
CREATE POLICY "recruitment_read_applications" ON public.applications
  FOR SELECT TO authenticated
  USING (public.is_admin_or_owner() OR public.user_role() IN ('recruitment_manager','event_manager'));

DROP POLICY IF EXISTS "recruitment_update_applications" ON public.applications;
CREATE POLICY "recruitment_update_applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner() OR public.user_role() IN ('recruitment_manager','event_manager'))
  WITH CHECK (public.is_admin_or_owner() OR public.user_role() IN ('recruitment_manager','event_manager'));

-- ========== INTERVIEWS ==========
CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 30,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  platform text,
  meeting_link text,
  instructions text,
  interviewer_name text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','rescheduled','cancelled','completed','no_show')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recruitment_read_interviews" ON public.interviews;
CREATE POLICY "recruitment_read_interviews" ON public.interviews
  FOR SELECT TO authenticated
  USING (public.is_admin_or_owner() OR public.user_role() IN ('recruitment_manager','event_manager'));

DROP POLICY IF EXISTS "recruitment_write_interviews" ON public.interviews;
CREATE POLICY "recruitment_write_interviews" ON public.interviews
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_owner() OR public.user_role() IN ('recruitment_manager','event_manager'));

DROP POLICY IF EXISTS "recruitment_update_interviews" ON public.interviews;
CREATE POLICY "recruitment_update_interviews" ON public.interviews
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner() OR public.user_role() IN ('recruitment_manager','event_manager'))
  WITH CHECK (public.is_admin_or_owner() OR public.user_role() IN ('recruitment_manager','event_manager'));

DROP POLICY IF EXISTS "admin_delete_interviews" ON public.interviews;
CREATE POLICY "admin_delete_interviews" ON public.interviews
  FOR DELETE TO authenticated
  USING (public.is_admin_or_owner());

CREATE INDEX IF NOT EXISTS interviews_application_idx ON public.interviews (application_id);

-- ========== APPLICATION STATUS HISTORY ==========
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recruitment_read_status_history" ON public.application_status_history;
CREATE POLICY "recruitment_read_status_history" ON public.application_status_history
  FOR SELECT TO authenticated
  USING (public.is_admin_or_owner() OR public.user_role() IN ('recruitment_manager','event_manager'));

DROP POLICY IF EXISTS "recruitment_write_status_history" ON public.application_status_history;
CREATE POLICY "recruitment_write_status_history" ON public.application_status_history
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_owner() OR public.user_role() IN ('recruitment_manager','event_manager'));

CREATE INDEX IF NOT EXISTS status_history_application_idx ON public.application_status_history (application_id, created_at);

-- ========== EXTEND EMAIL LOGS ==========
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ========== SEED DEFAULT EMAIL TEMPLATES ==========
INSERT INTO public.email_templates (key, subject, body) VALUES
('application_acknowledgement',
 'Your application to Team Synf — {{job_title}}',
 'Hi {{applicant_name}},

Thank you for applying to Team Synf for the role of {{job_title}}.

Your application has been received successfully.
Application ID: {{application_id}}
Submitted on: {{submission_date}}

Your application will be reviewed by our recruitment team. Please note that submission does not guarantee selection — we review every application carefully and will reach out if your profile matches our current needs.

Please keep your application ID ({{application_id}}) for any future correspondence with Team Synf.

If you have any questions, contact us at {{contact_email}}.

— Team Synf'),
('application_internal_notify',
 'New application received — {{applicant_name}} for {{job_title}}',
 'A new application has been submitted.

Applicant: {{applicant_name}}
Job: {{job_title}}
Application ID: {{application_id}}
Submitted: {{submission_date}}

Review this application in the admin dashboard.'),
('application_approval',
 'Welcome to Team Synf, {{applicant_name}}!',
 'Hi {{applicant_name}},

Congratulations! Your application for {{job_title}} has been approved.

Application ID: {{application_id}}

We''re excited to welcome you to the Team Synf collective. Here''s what happens next:
- Our team will reach out with onboarding details and next steps.
- If you have any questions in the meantime, contact us at {{contact_email}}.

Welcome aboard!

— Team Synf'),
('interview_invitation',
 'Interview invitation — {{job_title}} at Team Synf',
 'Hi {{applicant_name}},

You''ve been invited to an interview for the role of {{job_title}} at Team Synf.

Application ID: {{application_id}}

Interview details:
- Date: {{interview_date}}
- Time: {{interview_time}} ({{timezone}})
- Duration: {{interview_duration}} minutes
- Meeting link: {{meeting_link}}

{{additional_instructions}}

Please confirm your attendance by replying to this email. If the scheduled time doesn''t work for you, let us know and we''ll find an alternative.

— Team Synf'),
('interview_rescheduled',
 'Interview rescheduled — {{job_title}} at Team Synf',
 'Hi {{applicant_name}},

Your interview for {{job_title}} has been rescheduled.

Application ID: {{application_id}}

New interview details:
- Date: {{interview_date}}
- Time: {{interview_time}} ({{timezone}})
- Duration: {{interview_duration}} minutes
- Meeting link: {{meeting_link}}

{{additional_instructions}}

— Team Synf'),
('interview_cancelled',
 'Interview cancelled — {{job_title}} at Team Synf',
 'Hi {{applicant_name}},

Unfortunately, your interview for {{job_title}} scheduled on {{interview_date}} has been cancelled.

Application ID: {{application_id}}

We apologize for the inconvenience. Our team will reach out to you with further information.

If you have questions, contact us at {{contact_email}}.

— Team Synf'),
('application_rejection',
 'Update on your Team Synf application — {{job_title}}',
 'Hi {{applicant_name}},

Thank you for your interest in joining Team Synf for the role of {{job_title}}.

Application ID: {{application_id}}

After careful review of your application, we''re unable to move forward at this time.

Reason: {{rejection_reason}}

We truly appreciate the time and effort you put into your application, and we encourage you to apply again for future opportunities that match your profile.

— Team Synf'),
('request_additional_info',
 'Additional information needed — {{job_title}} at Team Synf',
 'Hi {{applicant_name}},

We''re reviewing your application for {{job_title}} and need some additional information.

Application ID: {{application_id}}

{{additional_instructions}}

Please reply to this email with the requested details.

— Team Synf')
ON CONFLICT (key) DO NOTHING;

-- ========== SEED DEFAULT REJECTION REASONS in site_content ==========
INSERT INTO public.site_content (slug, title, body, data, is_public)
VALUES ('rejection_reasons', 'Rejection Reasons', NULL,
  '{"reasons":["Experience does not currently match the role","Required skills are missing","Availability does not match event requirements","The role has been filled","The application does not meet the current selection criteria","Other"]}'::jsonb,
  false)
ON CONFLICT (slug) DO UPDATE SET data = EXCLUDED.data;
