// Legacy Role type — kept for backward compatibility. New system uses RoleId.
export type Role = 'founder' | 'owner' | 'admin' | 'recruitment_manager' | 'event_manager' | 'viewer' | 'crew' |
  'co_founder' | 'hr_manager' | 'department_head' | 'core_team_member';

export const ROLES: Role[] = ['founder', 'co_founder', 'hr_manager', 'admin', 'department_head', 'event_manager', 'core_team_member', 'crew', 'viewer'];

export const ROLE_LABELS: Record<string, string> = {
  founder: 'Founder',
  owner: 'Owner',
  co_founder: 'Co-Founder',
  hr_manager: 'HR / Recruitment Manager',
  admin: 'Admin / Operations',
  department_head: 'Department Head',
  event_manager: 'Event Manager',
  core_team_member: 'Core Team Member',
  recruitment_manager: 'Recruitment Manager',
  crew: 'Crew / Volunteer',
  viewer: 'Viewer / Observer',
};

// Role-specific accent colors for cards and badges
export const ROLE_COLORS: Record<string, { accent: string; bg: string; text: string; border: string; shadow: string }> = {
  founder: { accent: 'gold-400', bg: 'bg-gold-400/10', text: 'text-gold-400', border: 'border-gold-400/30', shadow: 'shadow-[0_0_30px_-10px] shadow-gold-400/30' },
  co_founder: { accent: 'synf-400', bg: 'bg-synf-500/15', text: 'text-synf-300', border: 'border-synf-500/30', shadow: 'shadow-[0_0_30px_-10px] shadow-synf-500/30' },
  hr_manager: { accent: 'acid-400', bg: 'bg-acid-400/10', text: 'text-acid-400', border: 'border-acid-400/30', shadow: 'shadow-[0_0_30px_-10px] shadow-acid-400/20' },
  admin: { accent: 'synf-400', bg: 'bg-synf-500/10', text: 'text-synf-400', border: 'border-synf-500/25', shadow: 'shadow-[0_0_25px_-10px] shadow-synf-500/20' },
  department_head: { accent: 'synf-400', bg: 'bg-synf-500/10', text: 'text-synf-400', border: 'border-synf-500/20', shadow: 'shadow-[0_0_25px_-10px] shadow-synf-500/20' },
  event_manager: { accent: 'synf-400', bg: 'bg-synf-500/8', text: 'text-synf-400', border: 'border-synf-500/20', shadow: 'shadow-[0_0_20px_-10px] shadow-synf-500/15' },
  core_team_member: { accent: 'white', bg: 'bg-white/5', text: 'text-white/80', border: 'border-white/10', shadow: '' },
  crew: { accent: 'ink-400', bg: 'bg-ink-800/50', text: 'text-ink-300', border: 'border-ink-700', shadow: '' },
  viewer: { accent: 'ink-400', bg: 'bg-ink-800/30', text: 'text-ink-400', border: 'border-ink-700/50', shadow: '' },
};

export const STAFF_ROLES: Role[] = ['founder', 'owner', 'co_founder', 'hr_manager', 'admin', 'department_head', 'event_manager', 'core_team_member', 'viewer'];

export function isStaff(role?: string | null): boolean {
  if (!role) return false;
  // Allow any role that's in the role_definitions table (broad check)
  return role !== 'crew' && role !== '';
}

export function isAdminOrOwner(role?: string | null): boolean {
  return role === 'founder' || role === 'owner' || role === 'admin' || role === 'co_founder';
}

export function isOwner(role?: string | null): boolean {
  return role === 'founder' || role === 'owner';
}

export function isFounder(role?: string | null): boolean {
  return role === 'founder';
}

export interface EventRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: 'draft' | 'announced' | 'upcoming' | 'completed' | 'postponed' | 'cancelled' | 'sold_out';
  featured: boolean;
  category: string | null;
  start_at: string | null;
  end_at: string | null;
  timezone: string | null;
  venue_name: string | null;
  venue_city: string | null;
  venue_address: string | null;
  map_url: string | null;
  dress_code: string | null;
  music_genres: string[] | null;
  description: string | null;
  story: string | null;
  ticket_url: string | null;
  info_url: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  aftermovie_url: string | null;
  booking_method: 'external_link' | 'instagram_dm' | 'instagram_profile' | 'coming_soon' | 'manual' | 'none';
  booking_cta_label: string | null;
  ticketing_message_mode: 'automatic' | 'custom';
  ticketing_custom_heading: string | null;
  ticketing_custom_message: string | null;
  ticketing_custom_cta_label: string | null;
  ticketing_custom_cta_url: string | null;
  ticketing_secondary_cta_label: string | null;
  ticketing_secondary_cta_url: string | null;
  waitlist_url: string | null;
  cancellation_info_url: string | null;
  ticketing_last_updated_at: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventMediaRow {
  id: string;
  event_id: string;
  type: 'image' | 'video';
  url: string;
  alt: string | null;
  caption: string | null;
  credit: string | null;
  source_url: string | null;
  sort_order: number;
  source_type?: 'upload' | 'url' | 'embed';
  poster_url?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  original_filename?: string | null;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  title?: string | null;
}

export interface EventCreditRow {
  id: string;
  event_id: string;
  role: string;
  name: string;
  link_url: string | null;
  sort_order: number;
}

export interface PersonRow {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  category: string | null;
  secondary_category: string | null;
  bio: string | null;
  portrait_url: string | null;
  portrait_alt: string | null;
  instagram_url: string | null;
  featured: boolean;
  status: 'draft' | 'pending_review' | 'approved' | 'hidden' | 'archived';
  sort_order: number;
  related_event_ids: string[];
}

export interface SiteContentRow {
  slug: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_public: boolean;
  updated_at: string;
}

export interface EnquiryRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  brand: string | null;
  category: string | null;
  category_id: string | null;
  subject: string | null;
  organization: string | null;
  preferred_contact_method: string | null;
  reference_number: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to: string | null;
  read_at: string | null;
  event_name: string | null;
  preferred_date: string | null;
  venue_city: string | null;
  budget_range: string | null;
  audience_size: string | null;
  message: string;
  links: string | null;
  consent_text: string | null;
  status: 'new' | 'reviewing' | 'replied' | 'in_discussion' | 'accepted' | 'closed' | 'resolved' | 'archived' | 'awaiting_response' | 'in_progress';
  follow_up_at: string | null;
  private_notes: string | null;
  last_updated_at: string;
  created_at: string;
}

export interface EnquiryCategoryRow {
  id: string;
  display_name: string;
  slug: string;
  description: string | null;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnquiryNoteRow {
  id: string;
  enquiry_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface EnquiryActivityRow {
  id: string;
  enquiry_id: string;
  actor_id: string | null;
  action: string;
  detail: string | null;
  created_at: string;
}

export const ENQUIRY_STATUSES = [
  'new', 'under_review', 'awaiting_response', 'in_progress', 'resolved', 'archived',
] as const;

export const ENQUIRY_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  under_review: 'Under Review',
  awaiting_response: 'Awaiting Response',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  archived: 'Archived',
  reviewing: 'Reviewing',
  replied: 'Replied',
  in_discussion: 'In Discussion',
  accepted: 'Accepted',
  closed: 'Closed',
};

export const ENQUIRY_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export const ENQUIRY_PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const ENQUIRY_PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  low: { text: 'text-ink-400', bg: 'bg-ink-800/50', border: 'border-ink-700' },
  normal: { text: 'text-white/70', bg: 'bg-white/5', border: 'border-white/10' },
  high: { text: 'text-gold-400', bg: 'bg-gold-400/10', border: 'border-gold-400/30' },
  urgent: { text: 'text-synf-400', bg: 'bg-synf-500/15', border: 'border-synf-500/40' },
};

export interface RecruitmentFormRow {
  id: string;
  version: number;
  is_active: boolean;
  title: string;
  intro: string | null;
  consent_text: string;
  fields: FormField[];
  published_at: string | null;
  created_at: string;
}

export type FieldType = 'short_text' | 'long_text' | 'email' | 'phone' | 'url' | 'dropdown' | 'multi_select' | 'radio' | 'checkbox' | 'date' | 'file';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  help?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export type ApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'interview_invited' | 'rejected' | 'withdrawn';

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  interview_invited: 'Interview Invited',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export interface ApplicationRow {
  id: string;
  form_id: string | null;
  job_id: string | null;
  application_code: string | null;
  form_snapshot: { fields: FormField[]; consent_text: string; title: string };
  answers: Record<string, unknown>;
  full_name: string;
  email: string;
  phone: string | null;
  instagram: string | null;
  city: string | null;
  preferred_role: string | null;
  status: ApplicationStatus;
  assigned_reviewer: string | null;
  rejection_reason: string | null;
  attachment_url: string | null;
  consent_text: string | null;
  reviewed_at: string | null;
  decision_at: string | null;
  created_at: string;
}

export type JobStatus = 'draft' | 'published' | 'paused' | 'closed' | 'archived';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  paused: 'Paused',
  closed: 'Closed',
  archived: 'Archived',
};

export type JobArrangement = 'volunteer' | 'event_based' | 'internship' | 'part_time' | 'contract' | 'other';

export const JOB_ARRANGEMENT_LABELS: Record<JobArrangement, string> = {
  volunteer: 'Volunteer',
  event_based: 'Event-Based',
  internship: 'Internship',
  part_time: 'Part-Time',
  contract: 'Contract',
  other: 'Other',
};

export interface JobPostingRow {
  id: string;
  slug: string;
  title: string;
  department: string;
  description: string | null;
  responsibilities: string | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  eligibility: string | null;
  num_openings: number | null;
  arrangement: JobArrangement;
  application_open: string;
  application_close: string | null;
  form_fields: FormField[];
  requires_portfolio: boolean;
  requires_cv: boolean;
  status: JobStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewRow {
  id: string;
  application_id: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  platform: string | null;
  meeting_link: string | null;
  instructions: string | null;
  interviewer_name: string | null;
  status: 'scheduled' | 'rescheduled' | 'cancelled' | 'completed' | 'no_show';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationStatusHistoryRow {
  id: string;
  application_id: string;
  old_status: string | null;
  new_status: string;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

export interface EmailTemplateRow {
  id: string;
  key: string;
  subject: string;
  body: string;
  updated_by: string | null;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  event_id: string | null;
  assignee_id: string | null;
  priority: 'low' | 'medium' | 'high';
  due_at: string | null;
  status: 'todo' | 'in_progress' | 'blocked' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface CrewAssignmentRow {
  id: string;
  event_id: string;
  user_id: string;
  crew_role: string;
  call_time: string | null;
  shift_end: string | null;
  responsibilities: string | null;
  acknowledged: boolean;
  created_at: string;
}

export interface AnnouncementRow {
  id: string;
  event_id: string;
  title: string;
  body: string;
  published_at: string;
  author_id: string | null;
}

export interface TeamProfileRow {
  id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_url: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface InvitationRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  role_id?: string | null;
  department_id?: string | null;
  join_classification_id?: string | null;
  reporting_manager_id?: string | null;
  custom_title?: string | null;
  phone?: string | null;
  how_joined?: string | null;
  setup_method?: string;
  status?: 'pending' | 'accepted' | 'expired' | 'suspended' | 'deactivated';
  invited_by: string | null;
  expires_at: string;
  activated_at: string | null;
  activated_by?: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface SubscriberRow {
  id: string;
  email: string;
  first_name: string | null;
  consent_text: string | null;
  consent_at: string;
  unsubscribed_at: string | null;
  created_at: string;
}

export interface ActivityLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  summary: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

export interface EmailLogRow {
  id: string;
  template_key: string | null;
  to_address: string;
  subject: string | null;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  error: string | null;
  application_id: string | null;
  attempts: number;
  provider_message_id: string | null;
  sent_by: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================
// Team Hierarchy & Access Control Types
// ============================================================

export interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  group_label: string;
  created_at: string;
}

export interface RoleDefinitionRow {
  id: string;
  display_name: string;
  description: string | null;
  hierarchy_level: number;
  is_system: boolean;
  can_assign_roles: string[];
  can_manage_roles: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermissionRow {
  role_id: string;
  module: string;
  action: string;
  allowed: boolean;
}

export interface JoinClassificationRow {
  id: string;
  display_name: string;
  sort_order: number;
  is_active: boolean;
}

export interface TeamMemberProfileRow {
  id: string;
  user_id: string;
  department_id: string | null;
  role_id: string;
  custom_title: string | null;
  phone: string | null;
  join_classification_id: string | null;
  reporting_manager_id: string | null;
  account_status: 'active' | 'suspended' | 'deactivated' | 'pending_setup';
  is_founding_member: boolean;
  is_founder: boolean;
  avatar_url: string | null;
  bio: string | null;
  instagram_url: string | null;
  display_name: string | null;
  full_name: string;
  created_by: string | null;
  last_login_at: string | null;
  deactivated_at: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  department?: DepartmentRow | null;
  role_definition?: RoleDefinitionRow | null;
  join_classification?: JoinClassificationRow | null;
  manager?: { id: string; full_name: string; display_name: string | null } | null;
}

export interface FounderRecordRow {
  id: number;
  user_id: string;
  previous_founder_id: string | null;
  transferred_at: string | null;
  created_at: string;
}

export interface OwnershipTransferHistoryRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  transferred_by: string;
  previous_role_id: string | null;
  new_role_id: string | null;
  created_at: string;
}

export interface SecurityEventRow {
  id: string;
  user_id: string | null;
  event_type: string;
  ip_hint: string | null;
  success: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SessionRevocationRow {
  id: string;
  user_id: string;
  revoked_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface SecretConfigStatus {
  configured: boolean;
  version: number;
  last_rotated: string | null;
}

export interface InvitationWithRelations extends InvitationRow {
  department?: DepartmentRow | null;
  role_definition?: RoleDefinitionRow | null;
  join_classification?: JoinClassificationRow | null;
}

// All permission modules
export const PERMISSION_MODULES = [
  'website_content', 'events', 'people', 'job_postings', 'applications',
  'interviews', 'email_templates', 'team_accounts', 'roles_permissions',
  'crew_invitations', 'tasks', 'calendar', 'collaboration_enquiries',
  'contact_enquiries', 'newsletter', 'media_library', 'analytics',
  'audit_logs', 'security_settings', 'founder_ownership',
] as const;

export const PERMISSION_ACTIONS = [
  'view', 'create', 'edit', 'publish', 'delete', 'export', 'manage_settings', 'manage_permissions',
] as const;

export const MODULE_LABELS: Record<string, string> = {
  website_content: 'Website Content',
  events: 'Events',
  people: 'People',
  job_postings: 'Job Postings',
  applications: 'Applications',
  interviews: 'Interviews',
  email_templates: 'Email Templates',
  team_accounts: 'Team Accounts',
  roles_permissions: 'Roles & Permissions',
  crew_invitations: 'Crew Invitations',
  tasks: 'Tasks',
  calendar: 'Calendar',
  collaboration_enquiries: 'Collaboration Enquiries',
  contact_enquiries: 'Contact Enquiries',
  newsletter: 'Newsletter',
  media_library: 'Media Library',
  analytics: 'Analytics',
  audit_logs: 'Audit Logs',
  security_settings: 'Security Settings',
  founder_ownership: 'Founder & Ownership',
};

export const ACTION_LABELS: Record<string, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  publish: 'Publish/Approve',
  delete: 'Delete',
  export: 'Export',
  manage_settings: 'Manage Settings',
  manage_permissions: 'Manage Permissions',
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
  pending_setup: 'Pending Setup',
};

export const INVITATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired',
  suspended: 'Suspended',
  deactivated: 'Revoked',
};

export const JOIN_CLASSIFICATION_LABELS: Record<string, string> = {
  founding_team: 'Founding Team',
  founder: 'Founder',
  co_founder: 'Co-Founder',
  recruitment_selection: 'Recruitment Selection',
  direct_appointment: 'Direct Appointment',
  event_crew: 'Event Crew',
  volunteer: 'Volunteer',
  internship: 'Internship',
  department_transfer: 'Department Transfer',
  other: 'Other',
};

export const DEPARTMENT_LABELS: Record<string, string> = {
  event_operations: 'Event Operations',
  marketing: 'Marketing & Social',
  creative: 'Design & Creative',
  photo_video: 'Photo & Video',
  artist_relations: 'Artist Relations',
  partnerships: 'Partnerships',
  logistics: 'Logistics & Production',
  general: 'General',
};

export const DEPARTMENT_GROUPS = [
  'Leadership & Management',
  'Events & Production',
  'Creative & Media',
  'Business & Partnerships',
  'Community & Support',
  'General',
] as const;

// ============================================================
// Notifications & Dashboard Preferences
// ============================================================

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  ref_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface DashboardPreferencesRow {
  user_id: string;
  hidden_widgets: string[];
  widget_order: string[];
  analytics_range: string;
  density: 'compact' | 'comfortable';
  updated_at: string;
}

export type PriorityTask = {
  id: string;
  type: 'application' | 'enquiry' | 'event' | 'interview' | 'invitation' | 'email' | 'task';
  title: string;
  subtitle: string;
  status: string;
  created_at: string;
  due_at: string | null;
  link: string;
  assignee: string | null;
  priority: 'high' | 'medium' | 'low';
};
