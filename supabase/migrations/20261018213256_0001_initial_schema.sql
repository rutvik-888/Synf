/*
# Team Synf — initial schema (split part 1: tables + base policies)

Creates all tables with RLS and non-circular policies first.
The events<->crew_assignments circular reference is resolved by deferring
the crew-read-assigned-events policy to part 2.
*/

-- ---------- role helpers ----------
create or replace function public.user_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'raw_app_meta_data' ->> 'role'), 'viewer')
$$;
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.user_role() in ('owner','admin','recruitment_manager','event_manager','viewer')
$$;
create or replace function public.is_admin_or_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select public.user_role() in ('owner','admin')
$$;
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select public.user_role() = 'owner'
$$;

-- ---------- team_profiles ----------
create table if not exists public.team_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  display_name text,
  avatar_url text,
  bio text,
  instagram_url text,
  role text not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.team_profiles enable row level security;
drop policy if exists "staff_read_team_profiles" on public.team_profiles;
create policy "staff_read_team_profiles" on public.team_profiles for select to authenticated using (public.is_staff());
drop policy if exists "self_read_own_profile" on public.team_profiles;
create policy "self_read_own_profile" on public.team_profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "self_update_own_profile" on public.team_profiles;
create policy "self_update_own_profile" on public.team_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "admin_manage_team_profiles" on public.team_profiles;
create policy "admin_manage_team_profiles" on public.team_profiles for all to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

-- ---------- invitations ----------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  role text not null default 'viewer',
  token_hash text not null,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  activated_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.invitations enable row level security;
drop policy if exists "staff_read_invitations" on public.invitations;
create policy "staff_read_invitations" on public.invitations for select to authenticated using (public.is_staff());
drop policy if exists "admin_insert_invitations" on public.invitations;
create policy "admin_insert_invitations" on public.invitations for insert to authenticated with check (public.is_admin_or_owner());
drop policy if exists "admin_update_invitations" on public.invitations;
create policy "admin_update_invitations" on public.invitations for update to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

-- ---------- events (no crew policy yet) ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  status text not null default 'draft' check (status in ('draft','announced','upcoming','completed','postponed','cancelled','sold_out')),
  featured boolean not null default false,
  category text,
  start_at timestamptz,
  end_at timestamptz,
  timezone text,
  venue_name text,
  venue_city text,
  venue_address text,
  map_url text,
  dress_code text,
  music_genres text[],
  description text,
  story text,
  ticket_url text,
  info_url text,
  cover_image_url text,
  cover_image_alt text,
  aftermovie_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.events enable row level security;
drop policy if exists "public_read_published_events" on public.events;
create policy "public_read_published_events" on public.events for select to anon, authenticated using (is_published = true);
drop policy if exists "staff_read_all_events" on public.events;
create policy "staff_read_all_events" on public.events for select to authenticated using (public.is_staff());
drop policy if exists "staff_write_events" on public.events;
create policy "staff_write_events" on public.events for insert to authenticated with check (public.is_staff());
drop policy if exists "staff_update_events" on public.events;
create policy "staff_update_events" on public.events for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "admin_delete_events" on public.events;
create policy "admin_delete_events" on public.events for delete to authenticated using (public.is_admin_or_owner());

-- ---------- crew_assignments ----------
create table if not exists public.crew_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  crew_role text not null,
  call_time timestamptz,
  shift_end timestamptz,
  responsibilities text,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.crew_assignments enable row level security;
drop policy if exists "self_read_crew_assignments" on public.crew_assignments;
create policy "self_read_crew_assignments" on public.crew_assignments for select to authenticated using (user_id = auth.uid());
drop policy if exists "staff_read_crew_assignments" on public.crew_assignments;
create policy "staff_read_crew_assignments" on public.crew_assignments for select to authenticated using (public.is_staff());
drop policy if exists "staff_write_crew_assignments" on public.crew_assignments;
create policy "staff_write_crew_assignments" on public.crew_assignments for insert to authenticated with check (public.is_staff());
drop policy if exists "staff_update_crew_assignments" on public.crew_assignments;
create policy "staff_update_crew_assignments" on public.crew_assignments for update to authenticated using (public.is_staff() or user_id = auth.uid()) with check (public.is_staff() or user_id = auth.uid());
drop policy if exists "admin_delete_crew_assignments" on public.crew_assignments;
create policy "admin_delete_crew_assignments" on public.crew_assignments for delete to authenticated using (public.is_admin_or_owner());

-- ---------- event_media ----------
create table if not exists public.event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  type text not null default 'image' check (type in ('image','video')),
  url text not null,
  alt text,
  caption text,
  credit text,
  source_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.event_media enable row level security;
drop policy if exists "public_read_event_media" on public.event_media;
create policy "public_read_event_media" on public.event_media for select to anon, authenticated using (
  exists (select 1 from public.events e where e.id = event_media.event_id and e.is_published = true)
);
drop policy if exists "staff_read_event_media" on public.event_media;
create policy "staff_read_event_media" on public.event_media for select to authenticated using (public.is_staff());
drop policy if exists "crew_read_event_media" on public.event_media;
create policy "crew_read_event_media" on public.event_media for select to authenticated using (
  exists (select 1 from public.crew_assignments ca where ca.user_id = auth.uid() and ca.event_id = event_media.event_id)
);
drop policy if exists "staff_write_event_media" on public.event_media;
create policy "staff_write_event_media" on public.event_media for insert to authenticated with check (public.is_staff());
drop policy if exists "staff_update_event_media" on public.event_media;
create policy "staff_update_event_media" on public.event_media for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff_delete_event_media" on public.event_media;
create policy "staff_delete_event_media" on public.event_media for delete to authenticated using (public.is_staff());

-- ---------- event_credits ----------
create table if not exists public.event_credits (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  role text not null,
  name text not null,
  link_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.event_credits enable row level security;
drop policy if exists "public_read_event_credits" on public.event_credits;
create policy "public_read_event_credits" on public.event_credits for select to anon, authenticated using (
  exists (select 1 from public.events e where e.id = event_credits.event_id and e.is_published = true)
);
drop policy if exists "staff_read_event_credits" on public.event_credits;
create policy "staff_read_event_credits" on public.event_credits for select to authenticated using (public.is_staff());
drop policy if exists "crew_read_event_credits" on public.event_credits;
create policy "crew_read_event_credits" on public.event_credits for select to authenticated using (
  exists (select 1 from public.crew_assignments ca where ca.user_id = auth.uid() and ca.event_id = event_credits.event_id)
);
drop policy if exists "staff_write_event_credits" on public.event_credits;
create policy "staff_write_event_credits" on public.event_credits for insert to authenticated with check (public.is_staff());
drop policy if exists "staff_update_event_credits" on public.event_credits;
create policy "staff_update_event_credits" on public.event_credits for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff_delete_event_credits" on public.event_credits;
create policy "staff_delete_event_credits" on public.event_credits for delete to authenticated using (public.is_staff());

-- ---------- people ----------
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text,
  category text check (category in ('core_team','dj_artist','creative_team','collaborator')),
  bio text,
  portrait_url text,
  portrait_alt text,
  instagram_url text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','pending_review','approved','hidden','archived')),
  sort_order int not null default 0,
  related_event_ids uuid[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.people enable row level security;
drop policy if exists "public_read_approved_people" on public.people;
create policy "public_read_approved_people" on public.people for select to anon, authenticated using (status = 'approved');
drop policy if exists "staff_read_all_people" on public.people;
create policy "staff_read_all_people" on public.people for select to authenticated using (public.is_staff());
drop policy if exists "staff_write_people" on public.people;
create policy "staff_write_people" on public.people for insert to authenticated with check (public.is_staff());
drop policy if exists "staff_update_people" on public.people;
create policy "staff_update_people" on public.people for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "admin_delete_people" on public.people;
create policy "admin_delete_people" on public.people for delete to authenticated using (public.is_admin_or_owner());

-- ---------- site_content ----------
create table if not exists public.site_content (
  slug text primary key,
  title text not null,
  body text,
  data jsonb,
  is_public boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.site_content enable row level security;
drop policy if exists "public_read_public_site_content" on public.site_content;
create policy "public_read_public_site_content" on public.site_content for select to anon, authenticated using (is_public = true);
drop policy if exists "staff_read_all_site_content" on public.site_content;
create policy "staff_read_all_site_content" on public.site_content for select to authenticated using (public.is_staff());
drop policy if exists "staff_write_site_content" on public.site_content;
create policy "staff_write_site_content" on public.site_content for insert to authenticated with check (public.is_staff());
drop policy if exists "staff_update_site_content" on public.site_content;
create policy "staff_update_site_content" on public.site_content for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- enquiries ----------
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  brand text,
  category text,
  event_name text,
  preferred_date date,
  venue_city text,
  budget_range text,
  audience_size text,
  message text not null,
  links text,
  consent_text text,
  status text not null default 'new' check (status in ('new','reviewing','replied','in_discussion','accepted','closed')),
  follow_up_at date,
  private_notes text,
  created_at timestamptz not null default now()
);
alter table public.enquiries enable row level security;
drop policy if exists "anon_insert_enquiries" on public.enquiries;
create policy "anon_insert_enquiries" on public.enquiries for insert to anon, authenticated with check (true);
drop policy if exists "staff_read_enquiries" on public.enquiries;
create policy "staff_read_enquiries" on public.enquiries for select to authenticated using (public.is_staff());
drop policy if exists "staff_update_enquiries" on public.enquiries;
create policy "staff_update_enquiries" on public.enquiries for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "admin_delete_enquiries" on public.enquiries;
create policy "admin_delete_enquiries" on public.enquiries for delete to authenticated using (public.is_admin_or_owner());

-- ---------- recruitment_forms ----------
create table if not exists public.recruitment_forms (
  id uuid primary key default gen_random_uuid(),
  version int not null,
  is_active boolean not null default false,
  title text not null,
  intro text,
  consent_text text not null,
  fields jsonb not null default '[]',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.recruitment_forms enable row level security;
drop policy if exists "public_read_active_recruitment_form" on public.recruitment_forms;
create policy "public_read_active_recruitment_form" on public.recruitment_forms for select to anon, authenticated using (is_active = true);
drop policy if exists "staff_read_recruitment_forms" on public.recruitment_forms;
create policy "staff_read_recruitment_forms" on public.recruitment_forms for select to authenticated using (public.is_staff());
drop policy if exists "admin_write_recruitment_forms" on public.recruitment_forms;
create policy "admin_write_recruitment_forms" on public.recruitment_forms for insert to authenticated with check (public.is_admin_or_owner() or public.user_role() = 'recruitment_manager');
drop policy if exists "admin_update_recruitment_forms" on public.recruitment_forms;
create policy "admin_update_recruitment_forms" on public.recruitment_forms for update to authenticated using (public.is_admin_or_owner() or public.user_role() = 'recruitment_manager') with check (public.is_admin_or_owner() or public.user_role() = 'recruitment_manager');

-- ---------- applications ----------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references public.recruitment_forms(id) on delete set null,
  form_snapshot jsonb not null,
  answers jsonb not null,
  full_name text not null,
  email text not null,
  phone text,
  instagram text,
  city text,
  preferred_role text,
  status text not null default 'new' check (status in ('new','reviewing','shortlisted','interview','selected','rejected')),
  attachment_path text,
  consent_text text,
  created_at timestamptz not null default now()
);
alter table public.applications enable row level security;
drop policy if exists "anon_insert_applications" on public.applications;
create policy "anon_insert_applications" on public.applications for insert to anon, authenticated with check (true);
drop policy if exists "recruitment_read_applications" on public.applications;
create policy "recruitment_read_applications" on public.applications for select to authenticated using (public.is_admin_or_owner() or public.user_role() = 'recruitment_manager');
drop policy if exists "recruitment_update_applications" on public.applications;
create policy "recruitment_update_applications" on public.applications for update to authenticated using (public.is_admin_or_owner() or public.user_role() = 'recruitment_manager') with check (public.is_admin_or_owner() or public.user_role() = 'recruitment_manager');
drop policy if exists "admin_delete_applications" on public.applications;
create policy "admin_delete_applications" on public.applications for delete to authenticated using (public.is_admin_or_owner());

-- ---------- application_notes ----------
create table if not exists public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.application_notes enable row level security;
drop policy if exists "recruitment_read_notes" on public.application_notes;
create policy "recruitment_read_notes" on public.application_notes for select to authenticated using (public.is_admin_or_owner() or public.user_role() = 'recruitment_manager');
drop policy if exists "recruitment_write_notes" on public.application_notes;
create policy "recruitment_write_notes" on public.application_notes for insert to authenticated with check (public.is_admin_or_owner() or public.user_role() = 'recruitment_manager');
drop policy if exists "admin_delete_notes" on public.application_notes;
create policy "admin_delete_notes" on public.application_notes for delete to authenticated using (public.is_admin_or_owner());

-- ---------- tasks ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_id uuid references public.events(id) on delete cascade,
  assignee_id uuid references auth.users(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_at timestamptz,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','completed')),
  checklist jsonb default '[]',
  private_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
drop policy if exists "staff_read_tasks" on public.tasks;
create policy "staff_read_tasks" on public.tasks for select to authenticated using (public.is_staff());
drop policy if exists "self_read_assigned_tasks" on public.tasks;
create policy "self_read_assigned_tasks" on public.tasks for select to authenticated using (assignee_id = auth.uid());
drop policy if exists "staff_write_tasks" on public.tasks;
create policy "staff_write_tasks" on public.tasks for insert to authenticated with check (public.is_staff());
drop policy if exists "staff_update_tasks" on public.tasks;
create policy "staff_update_tasks" on public.tasks for update to authenticated using (public.is_staff() or assignee_id = auth.uid()) with check (public.is_staff() or assignee_id = auth.uid());
drop policy if exists "admin_delete_tasks" on public.tasks;
create policy "admin_delete_tasks" on public.tasks for delete to authenticated using (public.is_admin_or_owner());

-- ---------- announcements ----------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  author_id uuid references auth.users(id) on delete set null
);
alter table public.announcements enable row level security;
drop policy if exists "crew_read_announcements" on public.announcements;
create policy "crew_read_announcements" on public.announcements for select to authenticated using (
  exists (select 1 from public.crew_assignments ca where ca.user_id = auth.uid() and ca.event_id = announcements.event_id)
  or public.is_staff()
);
drop policy if exists "staff_write_announcements" on public.announcements;
create policy "staff_write_announcements" on public.announcements for insert to authenticated with check (public.is_staff());
drop policy if exists "staff_update_announcements" on public.announcements;
create policy "staff_update_announcements" on public.announcements for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff_delete_announcements" on public.announcements;
create policy "staff_delete_announcements" on public.announcements for delete to authenticated using (public.is_admin_or_owner());

-- ---------- subscribers ----------
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  consent_text text,
  consent_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;
drop policy if exists "anon_insert_subscribers" on public.subscribers;
create policy "anon_insert_subscribers" on public.subscribers for insert to anon, authenticated with check (true);
drop policy if exists "anon_unsubscribe_self" on public.subscribers;
create policy "anon_unsubscribe_self" on public.subscribers for update to anon, authenticated using (true) with check (unsubscribed_at is not null);
drop policy if exists "staff_read_subscribers" on public.subscribers;
create policy "staff_read_subscribers" on public.subscribers for select to authenticated using (public.is_staff());
drop policy if exists "admin_delete_subscribers" on public.subscribers;
create policy "admin_delete_subscribers" on public.subscribers for delete to authenticated using (public.is_admin_or_owner());

-- ---------- email_templates ----------
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  subject text not null,
  body text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.email_templates enable row level security;
drop policy if exists "staff_read_email_templates" on public.email_templates;
create policy "staff_read_email_templates" on public.email_templates for select to authenticated using (public.is_staff());
drop policy if exists "admin_write_email_templates" on public.email_templates;
create policy "admin_write_email_templates" on public.email_templates for insert to authenticated with check (public.is_admin_or_owner());
drop policy if exists "admin_update_email_templates" on public.email_templates;
create policy "admin_update_email_templates" on public.email_templates for update to authenticated using (public.is_admin_or_owner()) with check (public.is_admin_or_owner());

-- ---------- email_logs ----------
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  template_key text,
  to_address text not null,
  subject text,
  status text not null default 'pending' check (status in ('pending','sent','failed','retrying')),
  error text,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.email_logs enable row level security;
drop policy if exists "staff_read_email_logs" on public.email_logs;
create policy "staff_read_email_logs" on public.email_logs for select to authenticated using (public.is_staff());
drop policy if exists "staff_insert_email_logs" on public.email_logs;
create policy "staff_insert_email_logs" on public.email_logs for insert to authenticated with check (public.is_staff());
drop policy if exists "staff_update_email_logs" on public.email_logs;
create policy "staff_update_email_logs" on public.email_logs for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- activity_log ----------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  summary text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
alter table public.activity_log enable row level security;
drop policy if exists "staff_read_activity_log" on public.activity_log;
create policy "staff_read_activity_log" on public.activity_log for select to authenticated using (public.is_staff());
drop policy if exists "staff_insert_activity_log" on public.activity_log;
create policy "staff_insert_activity_log" on public.activity_log for insert to authenticated with check (public.is_staff());
drop policy if exists "owner_delete_activity_log" on public.activity_log;
create policy "owner_delete_activity_log" on public.activity_log for delete to authenticated using (public.is_owner());

-- ---------- content_revisions ----------
create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  snapshot jsonb not null,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.content_revisions enable row level security;
drop policy if exists "staff_read_revisions" on public.content_revisions;
create policy "staff_read_revisions" on public.content_revisions for select to authenticated using (public.is_staff());
drop policy if exists "staff_insert_revisions" on public.content_revisions;
create policy "staff_insert_revisions" on public.content_revisions for insert to authenticated with check (public.is_staff());
drop policy if exists "admin_delete_revisions" on public.content_revisions;
create policy "admin_delete_revisions" on public.content_revisions for delete to authenticated using (public.is_admin_or_owner());

-- ---------- indexes ----------
create index if not exists events_published_idx on public.events (is_published, start_at);
create index if not exists event_media_event_idx on public.event_media (event_id, sort_order);
create index if not exists event_credits_event_idx on public.event_credits (event_id, sort_order);
create index if not exists enquiries_status_idx on public.enquiries (status, created_at);
create index if not exists applications_status_idx on public.applications (status, created_at);
create index if not exists crew_user_idx on public.crew_assignments (user_id);
create index if not exists announcements_event_idx on public.announcements (event_id, published_at);
