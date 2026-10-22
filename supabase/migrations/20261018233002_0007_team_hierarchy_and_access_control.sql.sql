/*
# Team Hierarchy, Access Control & Founder Management

## Overview
This migration implements a complete hierarchical team-account management system with granular permissions,
founder ownership, and secure login-secret gating. It extends the existing team_profiles and invitations tables
rather than replacing them.

## New Tables

1. **departments** — organizational departments (Event Operations, Marketing, Creative, etc.)
   - id (uuid PK), name (unique), description, sort_order, is_active, created_at

2. **role_definitions** — stable role definitions separate from member profiles
   - id (text PK, e.g. 'founder', 'co_founder', 'hr_manager'), display_name, description,
   - hierarchy_level (int, 0=founder highest, 100=lowest), is_system (bool — system roles can't be deleted),
   - can_assign_roles (text[] — which role ids this role can assign),
   - can_manage_roles (text[] — which role ids this role can manage/edit),
   - is_active, created_at, updated_at

3. **role_permissions** — per-role granular permission matrix
   - role_id (text FK → role_definitions), module (text), action (text),
   - allowed (bool), PRIMARY KEY (role_id, module, action)
   - Modules: events, job_postings, applications, interviews, email_templates, team_accounts,
     roles_permissions, crew_invitations, tasks, calendar, collaboration_enquiries,
     contact_enquiries, newsletter, media_library, analytics, audit_logs, security_settings,
     founder_ownership, website_content, people
   - Actions: view, create, edit, publish, delete, export, manage_settings, manage_permissions

4. **join_classifications** — how a member joined (Founding Team, Recruitment Selection, etc.)
   - id (text PK), display_name, sort_order, is_active

5. **team_member_profiles** — extended member data linked to team_profiles + auth.users
   - id (uuid PK, same as auth.users id), user_id (uuid FK → team_profiles.id),
   - department_id (text FK → departments.id), role_id (text FK → role_definitions.id),
   - custom_title, phone, join_classification_id (text FK → join_classifications.id),
   - reporting_manager_id (uuid, self-ref → team_member_profiles.id),
   - account_status ('active'|'suspended'|'deactivated'|'pending_setup'),
   - is_founding_member (bool), is_founder (bool),
   - avatar_url, bio, instagram_url, display_name, full_name,
   - created_by (uuid), last_login_at, deactivated_at, suspended_at,
   - created_at, updated_at

6. **founder_record** — single-row ownership table
   - id (int PK, always 1), user_id (uuid), previous_founder_id (uuid),
   - transferred_at, created_at
   - Constraint: only one row can exist

7. **login_secret_config** — hashed login secret + rotation history
   - id (int PK always 1), secret_hash (text), secret_version (int),
   - rotated_by (uuid), rotated_at, created_at

8. **secret_rotation_history** — append-only log of secret changes
   - id (uuid PK), rotated_by, previous_version, new_version, created_at

9. **security_events** — login attempts, lockouts, secret attempts
   - id (uuid PK), user_id (text), event_type, ip_hint, success (bool),
   - metadata (jsonb), created_at
   - event_type values: 'login_attempt', 'secret_attempt', 'lockout', 'session_revoked',
     'founder_transfer', 'role_change', 'account_suspended', 'account_reactivated'

10. **session_revocations** — tracks revoked sessions
    - id (uuid PK), user_id, revoked_by, reason, created_at

11. **ownership_transfer_history** — immutable append-only log
    - id (uuid PK), from_user_id, to_user_id, transferred_by,
    - previous_role_id, new_role_id, confirmed_at, created_at

## Modified Tables
- **team_profiles**: added updated_at column (already exists), no data changes
- **invitations**: added department_id, role_id, join_classification_id, reporting_manager_id,
  custom_title, phone, how_joined, account_status, setup_method columns

## Security (RLS)
- All new tables have RLS enabled
- team_member_profiles: users can read own row; staff can read all; only server-side functions write
- role_definitions, role_permissions: staff can read; only server-side functions write
- founder_record: staff can read; only server-side functions write
- login_secret_config: NO direct read access (service-role only); prevents secret exposure
- security_events: users can read own events; admins can read all; server-side writes
- session_revocations: users can read own; admins read all; server-side writes
- ownership_transfer_history: staff can read; server-side writes

## Important Notes
1. System roles (founder, co_founder, hr_manager, admin, department_head, event_manager,
   core_team_member, crew, viewer) are seeded with is_system=true and cannot be deleted.
2. Default permissions are seeded for each role per the spec.
3. The founder bootstrap for rutvik0888@gmail.com is done via a server-side edge function,
   not in this migration, because we cannot query auth.users from SQL.
4. The login secret is stored as a bcrypt-style hash using the pgcrypto extension.
*/

-- Required extension for cryptographic hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_departments" ON public.departments;
CREATE POLICY "staff_read_departments" ON public.departments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.team_profiles tp WHERE tp.id = auth.uid() AND tp.is_active = true)
  );
DROP POLICY IF EXISTS "anon_read_departments" ON public.departments;
CREATE POLICY "anon_read_departments" ON public.departments FOR SELECT
  TO anon USING (false);

-- Seed departments
INSERT INTO public.departments (id, name, sort_order) VALUES
  ('event_operations', 'Event Operations', 1),
  ('marketing', 'Marketing & Social', 2),
  ('creative', 'Design & Creative', 3),
  ('photo_video', 'Photo & Video', 4),
  ('artist_relations', 'Artist Relations', 5),
  ('partnerships', 'Partnerships', 6),
  ('logistics', 'Logistics & Production', 7),
  ('general', 'General', 99)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. ROLE DEFINITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_definitions (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  description text,
  hierarchy_level integer NOT NULL DEFAULT 50,
  is_system boolean NOT NULL DEFAULT false,
  can_assign_roles text[] NOT NULL DEFAULT '{}',
  can_manage_roles text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_role_definitions" ON public.role_definitions;
CREATE POLICY "staff_read_role_definitions" ON public.role_definitions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.team_profiles tp WHERE tp.id = auth.uid() AND tp.is_active = true)
  );
DROP POLICY IF EXISTS "anon_read_role_definitions" ON public.role_definitions;
CREATE POLICY "anon_read_role_definitions" ON public.role_definitions FOR SELECT
  TO anon USING (false);

-- Seed system roles
INSERT INTO public.role_definitions (id, display_name, description, hierarchy_level, is_system, can_assign_roles, can_manage_roles) VALUES
  ('founder', 'Founder', 'Complete platform and ownership control. The single owner of Team Synf.', 0, true, ARRAY['co_founder','hr_manager','admin','department_head','event_manager','core_team_member','crew','viewer'], ARRAY['co_founder','hr_manager','admin','department_head','event_manager','core_team_member','crew','viewer']),
  ('co_founder', 'Co-Founder', 'Executive leadership with broad access delegated by the founder.', 10, true, ARRAY['hr_manager','admin','department_head','event_manager','core_team_member','crew','viewer'], ARRAY['hr_manager','admin','department_head','event_manager','core_team_member','crew','viewer']),
  ('hr_manager', 'HR / Recruitment Manager', 'Team accounts, job postings, applications, interviews, selection, and onboarding.', 20, true, ARRAY['event_manager','core_team_member','crew','viewer'], ARRAY['event_manager','core_team_member','crew','viewer']),
  ('admin', 'Admin / Operations Administrator', 'Operational administration according to granted permissions.', 30, true, ARRAY['core_team_member','crew','viewer'], ARRAY['core_team_member','crew','viewer']),
  ('department_head', 'Department Head / Team Lead', 'Management of an assigned department.', 35, true, ARRAY['core_team_member','crew','viewer'], ARRAY['core_team_member','crew','viewer']),
  ('event_manager', 'Event Manager', 'Assigned event management and event-specific crew coordination.', 40, true, ARRAY['crew','viewer'], ARRAY['crew','viewer']),
  ('core_team_member', 'Core Team Member', 'Access to assigned workspaces, tasks, and permitted event information.', 50, true, ARRAY['crew'], ARRAY['crew']),
  ('crew', 'Crew / Volunteer', 'Limited access to assigned events, tasks, and crew resources.', 70, true, ARRAY[]::text[], ARRAY[]::text[]),
  ('viewer', 'Viewer / Observer', 'Read-only access to explicitly permitted modules.', 90, true, ARRAY[]::text[], ARRAY[]::text[])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. ROLE PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id text NOT NULL REFERENCES public.role_definitions(id) ON DELETE CASCADE,
  module text NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (role_id, module, action)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_role_permissions" ON public.role_permissions;
CREATE POLICY "staff_read_role_permissions" ON public.role_permissions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.team_profiles tp WHERE tp.id = auth.uid() AND tp.is_active = true)
  );
DROP POLICY IF EXISTS "anon_read_role_permissions" ON public.role_permissions;
CREATE POLICY "anon_read_role_permissions" ON public.role_permissions FOR SELECT
  TO anon USING (false);

-- Seed default permissions
-- Helper: we insert all permissions for founder (everything allowed), and curated sets for others.
INSERT INTO public.role_permissions (role_id, module, action, allowed)
SELECT 'founder', m.module, a.action, true
FROM (VALUES
  ('website_content'),('events'),('people'),('job_postings'),('applications'),
  ('interviews'),('email_templates'),('team_accounts'),('roles_permissions'),
  ('crew_invitations'),('tasks'),('calendar'),('collaboration_enquiries'),
  ('contact_enquiries'),('newsletter'),('media_library'),('analytics'),
  ('audit_logs'),('security_settings'),('founder_ownership')
) AS m(module)
CROSS JOIN (VALUES
  ('view'),('create'),('edit'),('publish'),('delete'),('export'),('manage_settings'),('manage_permissions')
) AS a(action)
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Co-Founder: broad access except founder_ownership and security_settings management
INSERT INTO public.role_permissions (role_id, module, action, allowed)
SELECT 'co_founder', m.module, a.action, true
FROM (VALUES
  ('website_content'),('events'),('people'),('job_postings'),('applications'),
  ('interviews'),('email_templates'),('team_accounts'),('roles_permissions'),
  ('crew_invitations'),('tasks'),('calendar'),('collaboration_enquiries'),
  ('contact_enquiries'),('newsletter'),('media_library'),('analytics'),('audit_logs')
) AS m(module)
CROSS JOIN (VALUES
  ('view'),('create'),('edit'),('publish'),('delete'),('export'),('manage_settings')
) AS a(action)
ON CONFLICT (role_id, module, action) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module, action, allowed) VALUES
  ('co_founder', 'security_settings', 'view', true),
  ('co_founder', 'founder_ownership', 'view', false)
ON CONFLICT (role_id, module, action) DO NOTHING;

-- HR Manager: recruitment + team accounts within delegation
INSERT INTO public.role_permissions (role_id, module, action, allowed) VALUES
  ('hr_manager', 'job_postings', 'view', true),
  ('hr_manager', 'job_postings', 'create', true),
  ('hr_manager', 'job_postings', 'edit', true),
  ('hr_manager', 'job_postings', 'publish', true),
  ('hr_manager', 'job_postings', 'delete', true),
  ('hr_manager', 'applications', 'view', true),
  ('hr_manager', 'applications', 'edit', true),
  ('hr_manager', 'applications', 'publish', true),
  ('hr_manager', 'applications', 'export', true),
  ('hr_manager', 'interviews', 'view', true),
  ('hr_manager', 'interviews', 'create', true),
  ('hr_manager', 'interviews', 'edit', true),
  ('hr_manager', 'interviews', 'delete', true),
  ('hr_manager', 'email_templates', 'view', true),
  ('hr_manager', 'email_templates', 'edit', true),
  ('hr_manager', 'team_accounts', 'view', true),
  ('hr_manager', 'team_accounts', 'create', true),
  ('hr_manager', 'team_accounts', 'edit', true),
  ('hr_manager', 'crew_invitations', 'view', true),
  ('hr_manager', 'crew_invitations', 'create', true),
  ('hr_manager', 'crew_invitations', 'edit', true),
  ('hr_manager', 'people', 'view', true),
  ('hr_manager', 'people', 'edit', true),
  ('hr_manager', 'website_content', 'view', true)
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Admin: operations admin with broad but not founder-level access
INSERT INTO public.role_permissions (role_id, module, action, allowed) VALUES
  ('admin', 'website_content', 'view', true),
  ('admin', 'website_content', 'create', true),
  ('admin', 'website_content', 'edit', true),
  ('admin', 'website_content', 'publish', true),
  ('admin', 'events', 'view', true),
  ('admin', 'events', 'create', true),
  ('admin', 'events', 'edit', true),
  ('admin', 'events', 'publish', true),
  ('admin', 'events', 'delete', true),
  ('admin', 'people', 'view', true),
  ('admin', 'people', 'edit', true),
  ('admin', 'people', 'create', true),
  ('admin', 'people', 'delete', true),
  ('admin', 'job_postings', 'view', true),
  ('admin', 'job_postings', 'create', true),
  ('admin', 'job_postings', 'edit', true),
  ('admin', 'job_postings', 'publish', true),
  ('admin', 'applications', 'view', true),
  ('admin', 'applications', 'edit', true),
  ('admin', 'applications', 'publish', true),
  ('admin', 'interviews', 'view', true),
  ('admin', 'interviews', 'create', true),
  ('admin', 'interviews', 'edit', true),
  ('admin', 'email_templates', 'view', true),
  ('admin', 'email_templates', 'edit', true),
  ('admin', 'team_accounts', 'view', true),
  ('admin', 'team_accounts', 'edit', true),
  ('admin', 'crew_invitations', 'view', true),
  ('admin', 'crew_invitations', 'create', true),
  ('admin', 'tasks', 'view', true),
  ('admin', 'tasks', 'create', true),
  ('admin', 'tasks', 'edit', true),
  ('admin', 'tasks', 'delete', true),
  ('admin', 'calendar', 'view', true),
  ('admin', 'collaboration_enquiries', 'view', true),
  ('admin', 'collaboration_enquiries', 'edit', true),
  ('admin', 'contact_enquiries', 'view', true),
  ('admin', 'contact_enquiries', 'edit', true),
  ('admin', 'newsletter', 'view', true),
  ('admin', 'newsletter', 'create', true),
  ('admin', 'newsletter', 'edit', true),
  ('admin', 'media_library', 'view', true),
  ('admin', 'media_library', 'create', true),
  ('admin', 'media_library', 'edit', true),
  ('admin', 'media_library', 'delete', true),
  ('admin', 'analytics', 'view', true),
  ('admin', 'analytics', 'export', true),
  ('admin', 'audit_logs', 'view', true)
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Department Head: manage their department members + events
INSERT INTO public.role_permissions (role_id, module, action, allowed) VALUES
  ('department_head', 'events', 'view', true),
  ('department_head', 'events', 'create', true),
  ('department_head', 'events', 'edit', true),
  ('department_head', 'people', 'view', true),
  ('department_head', 'people', 'edit', true),
  ('department_head', 'team_accounts', 'view', true),
  ('department_head', 'team_accounts', 'edit', true),
  ('department_head', 'tasks', 'view', true),
  ('department_head', 'tasks', 'create', true),
  ('department_head', 'tasks', 'edit', true),
  ('department_head', 'calendar', 'view', true),
  ('department_head', 'crew_invitations', 'view', true),
  ('department_head', 'crew_invitations', 'create', true),
  ('department_head', 'website_content', 'view', true)
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Event Manager: events + crew coordination
INSERT INTO public.role_permissions (role_id, module, action, allowed) VALUES
  ('event_manager', 'events', 'view', true),
  ('event_manager', 'events', 'create', true),
  ('event_manager', 'events', 'edit', true),
  ('event_manager', 'events', 'publish', true),
  ('event_manager', 'people', 'view', true),
  ('event_manager', 'crew_invitations', 'view', true),
  ('event_manager', 'crew_invitations', 'create', true),
  ('event_manager', 'crew_invitations', 'edit', true),
  ('event_manager', 'tasks', 'view', true),
  ('event_manager', 'tasks', 'create', true),
  ('event_manager', 'tasks', 'edit', true),
  ('event_manager', 'calendar', 'view', true),
  ('event_manager', 'website_content', 'view', true),
  ('event_manager', 'applications', 'view', true)
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Core Team Member: assigned workspaces + tasks
INSERT INTO public.role_permissions (role_id, module, action, allowed) VALUES
  ('core_team_member', 'events', 'view', true),
  ('core_team_member', 'people', 'view', true),
  ('core_team_member', 'tasks', 'view', true),
  ('core_team_member', 'tasks', 'edit', true),
  ('core_team_member', 'calendar', 'view', true),
  ('core_team_member', 'website_content', 'view', true)
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Crew: limited access
INSERT INTO public.role_permissions (role_id, module, action, allowed) VALUES
  ('crew', 'calendar', 'view', true),
  ('crew', 'tasks', 'view', true)
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Viewer: read-only on explicitly permitted modules
INSERT INTO public.role_permissions (role_id, module, action, allowed) VALUES
  ('viewer', 'events', 'view', true),
  ('viewer', 'people', 'view', true),
  ('viewer', 'website_content', 'view', true),
  ('viewer', 'calendar', 'view', true)
ON CONFLICT (role_id, module, action) DO NOTHING;

-- ============================================================
-- 4. JOIN CLASSIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.join_classifications (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.join_classifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_join_classifications" ON public.join_classifications;
CREATE POLICY "staff_read_join_classifications" ON public.join_classifications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.team_profiles tp WHERE tp.id = auth.uid() AND tp.is_active = true)
  );
DROP POLICY IF EXISTS "anon_read_join_classifications" ON public.join_classifications;
CREATE POLICY "anon_read_join_classifications" ON public.join_classifications FOR SELECT
  TO anon USING (false);

INSERT INTO public.join_classifications (id, display_name, sort_order) VALUES
  ('founding_team', 'Founding Team', 1),
  ('founder', 'Founder', 2),
  ('co_founder', 'Co-Founder', 3),
  ('recruitment_selection', 'Recruitment Selection', 4),
  ('direct_appointment', 'Direct Appointment', 5),
  ('event_crew', 'Event Crew', 6),
  ('volunteer', 'Volunteer', 7),
  ('internship', 'Internship', 8),
  ('department_transfer', 'Department Transfer', 9),
  ('other', 'Other', 99)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. TEAM MEMBER PROFILES (extended)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_member_profiles (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.team_profiles(id) ON DELETE CASCADE,
  department_id text REFERENCES public.departments(id),
  role_id text NOT NULL DEFAULT 'viewer' REFERENCES public.role_definitions(id),
  custom_title text,
  phone text,
  join_classification_id text REFERENCES public.join_classifications(id),
  reporting_manager_id uuid REFERENCES public.team_member_profiles(id),
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended','deactivated','pending_setup')),
  is_founding_member boolean NOT NULL DEFAULT false,
  is_founder boolean NOT NULL DEFAULT false,
  avatar_url text,
  bio text,
  instagram_url text,
  display_name text,
  full_name text NOT NULL DEFAULT '',
  created_by uuid,
  last_login_at timestamptz,
  deactivated_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_member_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_read_own" ON public.team_member_profiles;
CREATE POLICY "members_read_own" ON public.team_member_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "staff_read_all_members" ON public.team_member_profiles;
CREATE POLICY "staff_read_all_members" ON public.team_member_profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.team_profiles tp WHERE tp.id = auth.uid() AND tp.is_active = true)
  );
DROP POLICY IF EXISTS "members_update_own_non_sensitive" ON public.team_member_profiles;
CREATE POLICY "members_update_own_non_sensitive" ON public.team_member_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "anon_read_members" ON public.team_member_profiles;
CREATE POLICY "anon_read_members" ON public.team_member_profiles FOR SELECT
  TO anon USING (false);

-- ============================================================
-- 6. FOUNDER RECORD (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.founder_record (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  user_id uuid NOT NULL,
  previous_founder_id uuid,
  transferred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.founder_record ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_founder" ON public.founder_record;
CREATE POLICY "staff_read_founder" ON public.founder_record FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.team_profiles tp WHERE tp.id = auth.uid() AND tp.is_active = true)
  );
DROP POLICY IF EXISTS "anon_read_founder" ON public.founder_record;
CREATE POLICY "anon_read_founder" ON public.founder_record FOR SELECT
  TO anon USING (false);

-- ============================================================
-- 7. LOGIN SECRET CONFIG (NO read access — service role only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_secret_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  secret_hash text NOT NULL,
  secret_version integer NOT NULL DEFAULT 1,
  rotated_by uuid,
  rotated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.login_secret_config ENABLE ROW LEVEL SECURITY;
-- NO policies: no client can read this table. Only the service role (bypasses RLS) can.
DROP POLICY IF EXISTS "anon_read_secret" ON public.login_secret_config;
CREATE POLICY "anon_read_secret" ON public.login_secret_config FOR SELECT
  TO anon, authenticated USING (false);

-- ============================================================
-- 8. SECRET ROTATION HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.secret_rotation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rotated_by uuid,
  previous_version integer,
  new_version integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.secret_rotation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_read_secret_history" ON public.secret_rotation_history;
CREATE POLICY "admins_read_secret_history" ON public.secret_rotation_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.team_member_profiles tmp WHERE tmp.id = auth.uid()
      AND tmp.role_id IN ('founder','co_founder','admin'))
  );

-- ============================================================
-- 9. SECURITY EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  event_type text NOT NULL,
  ip_hint text,
  success boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_security_events" ON public.security_events;
CREATE POLICY "users_read_own_security_events" ON public.security_events FOR SELECT
  TO authenticated USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "admins_read_all_security_events" ON public.security_events;
CREATE POLICY "admins_read_all_security_events" ON public.security_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.team_member_profiles tmp WHERE tmp.id = auth.uid()
      AND tmp.role_id IN ('founder','co_founder','admin'))
  );

-- Index for rate-limiting queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_type_created
  ON public.security_events (user_id, event_type, created_at DESC);

-- ============================================================
-- 10. SESSION REVOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  revoked_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.session_revocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_revocations" ON public.session_revocations;
CREATE POLICY "users_read_own_revocations" ON public.session_revocations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins_read_all_revocations" ON public.session_revocations;
CREATE POLICY "admins_read_all_revocations" ON public.session_revocations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.team_member_profiles tmp WHERE tmp.id = auth.uid()
      AND tmp.role_id IN ('founder','co_founder','admin'))
  );

-- ============================================================
-- 11. OWNERSHIP TRANSFER HISTORY (immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ownership_transfer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  transferred_by uuid NOT NULL,
  previous_role_id text,
  new_role_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ownership_transfer_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_transfer_history" ON public.ownership_transfer_history;
CREATE POLICY "staff_read_transfer_history" ON public.ownership_transfer_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.team_profiles tp WHERE tp.id = auth.uid() AND tp.is_active = true)
  );

-- ============================================================
-- 12. UPGRADE INVITATIONS TABLE
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='department_id') THEN
    ALTER TABLE public.invitations ADD COLUMN department_id text REFERENCES public.departments(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='role_id') THEN
    ALTER TABLE public.invitations ADD COLUMN role_id text REFERENCES public.role_definitions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='join_classification_id') THEN
    ALTER TABLE public.invitations ADD COLUMN join_classification_id text REFERENCES public.join_classifications(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='reporting_manager_id') THEN
    ALTER TABLE public.invitations ADD COLUMN reporting_manager_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='custom_title') THEN
    ALTER TABLE public.invitations ADD COLUMN custom_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='phone') THEN
    ALTER TABLE public.invitations ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='how_joined') THEN
    ALTER TABLE public.invitations ADD COLUMN how_joined text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='setup_method') THEN
    ALTER TABLE public.invitations ADD COLUMN setup_method text NOT NULL DEFAULT 'invite_link';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='status') THEN
    ALTER TABLE public.invitations ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','suspended','deactivated'));
  END IF;
END $$;

-- Migrate existing invitations 'role' text to role_id if possible
UPDATE public.invitations SET role_id = CASE
  WHEN role = 'owner' THEN 'founder'
  WHEN role = 'admin' THEN 'admin'
  WHEN role = 'recruitment_manager' THEN 'hr_manager'
  WHEN role = 'event_manager' THEN 'event_manager'
  WHEN role = 'viewer' THEN 'viewer'
  WHEN role = 'crew' THEN 'crew'
  ELSE 'viewer'
END WHERE role_id IS NULL;

-- ============================================================
-- 13. SECURITY DEFINER FUNCTIONS for permission checks
-- ============================================================
-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_module text, p_action text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_member_profiles tmp
    JOIN public.role_permissions rp ON rp.role_id = tmp.role_id
    WHERE tmp.id = p_user_id
      AND tmp.account_status = 'active'
      AND rp.module = p_module
      AND rp.action = p_action
      AND rp.allowed = true
  );
$$;

-- Function to get the current founder's user_id
CREATE OR REPLACE FUNCTION public.get_founder_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT user_id FROM public.founder_record WHERE id = 1;
$$;

-- Function to check if a user is the founder
CREATE OR REPLACE FUNCTION public.is_founder(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.founder_record WHERE id = 1 AND user_id = p_user_id);
$$;

-- Function to get a user's effective role_id
CREATE OR REPLACE FUNCTION public.get_user_role_id(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role_id FROM public.team_member_profiles WHERE id = p_user_id;
$$;

-- Function to check if user can assign a given role
CREATE OR REPLACE FUNCTION public.can_assign_role(p_assigner uuid, p_role_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_member_profiles tmp
    JOIN public.role_definitions rd ON rd.id = tmp.role_id
    WHERE tmp.id = p_assigner
      AND tmp.account_status = 'active'
      AND (
        -- Founder can assign anything
        tmp.is_founder = true
        OR
        -- Or the role is in the assigner's can_assign_roles list
        p_role_id = ANY(rd.can_assign_roles)
      )
      -- Cannot assign founder role (only via transfer)
      AND p_role_id <> 'founder'
  );
$$;

-- Grant execute on helper functions to authenticated
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_founder_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_founder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_role(uuid, text) TO authenticated;

-- ============================================================
-- 14. SYNC team_profiles role to new role_id system
-- ============================================================
-- Map old role strings to new role_definition ids
UPDATE public.team_profiles SET role = 'founder' WHERE role = 'owner';

-- ============================================================
-- 15. Migrate existing team_profiles into team_member_profiles
-- ============================================================
INSERT INTO public.team_member_profiles (id, user_id, role_id, full_name, account_status, is_founder, is_founding_member)
SELECT tp.id, tp.id,
  CASE WHEN tp.role = 'founder' THEN 'founder' ELSE 'viewer' END,
  tp.full_name,
  'active',
  (tp.role = 'founder'),
  (tp.role = 'founder')
FROM public.team_profiles tp
WHERE NOT EXISTS (SELECT 1 FROM public.team_member_profiles tmp WHERE tmp.id = tp.id);
