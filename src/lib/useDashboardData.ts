import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type {
  EventRow, EnquiryRow, ApplicationRow, ActivityLogRow, InvitationRow,
  TeamMemberProfileRow, InterviewRow, TaskRow, EmailLogRow, NotificationRow,
  DashboardPreferencesRow, JobPostingRow, PriorityTask,
} from './types';

export interface DashboardMetrics {
  eventsPublished: number;
  eventsDraft: number;
  eventsUpcoming: number;
  eventsPast: number;
  eventsNeedsAttention: number;
  applicationsNew: number;
  applicationsUnderReview: number;
  interviewsScheduled: number;
  applicationsApproved: number;
  collaborationNew: number;
  collaborationUnderReview: number;
  collaborationInDiscussion: number;
  collaborationAwaitingDecision: number;
  enquiriesNew: number;
  enquiriesAwaitingResponse: number;
  enquiriesResolved: number;
  teamActive: number;
  teamPendingInvites: number;
  jobsPublished: number;
  jobsDraft: number;
  failedEmails: number;
}

export interface PriorityTaskData extends PriorityTask {}

export interface DashboardData {
  metrics: DashboardMetrics | null;
  upcomingEvents: EventRow[];
  recentActivity: ActivityLogRow[];
  priorityTasks: PriorityTask[];
  notifications: NotificationRow[];
  myTasks: TaskRow[];
  myEvents: EventRow[];
  myApplications: ApplicationRow[];
  myEnquiries: EnquiryRow[];
  failedEmails: EmailLogRow[];
  preferences: DashboardPreferencesRow | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  savePreferences: (prefs: Partial<DashboardPreferencesRow>) => Promise<void>;
}

const ZERO_METRICS: DashboardMetrics = {
  eventsPublished: 0, eventsDraft: 0, eventsUpcoming: 0, eventsPast: 0, eventsNeedsAttention: 0,
  applicationsNew: 0, applicationsUnderReview: 0, interviewsScheduled: 0, applicationsApproved: 0,
  collaborationNew: 0, collaborationUnderReview: 0, collaborationInDiscussion: 0, collaborationAwaitingDecision: 0,
  enquiriesNew: 0, enquiriesAwaitingResponse: 0, enquiriesResolved: 0,
  teamActive: 0, teamPendingInvites: 0, jobsPublished: 0, jobsDraft: 0, failedEmails: 0,
};

export function useDashboardData(): DashboardData {
  const { user, isStaff, isAdminOrOwner, role, memberProfile, hasPermission } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLogRow[]>([]);
  const [priorityTasks, setPriorityTasks] = useState<PriorityTask[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [myTasks, setMyTasks] = useState<TaskRow[]>([]);
  const [myEvents, setMyEvents] = useState<EventRow[]>([]);
  const [myApplications, setMyApplications] = useState<ApplicationRow[]>([]);
  const [myEnquiries, setMyEnquiries] = useState<EnquiryRow[]>([]);
  const [failedEmails, setFailedEmails] = useState<EmailLogRow[]>([]);
  const [preferences, setPreferences] = useState<DashboardPreferencesRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!isStaff || !user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const uid = user.id;
        const now = new Date().toISOString();
        const isRecruitment = role === 'founder' || role === 'owner' || role === 'co_founder' || role === 'hr_manager' || role === 'admin' || role === 'recruitment_manager' || role === 'event_manager';
        const canSeeEnquiries = isAdminOrOwner;
        const canSeeTeam = isAdminOrOwner;

        // Run queries in parallel — each respects RLS
        const queries = [
          // Events — staff can read all
          Promise.resolve(supabase.from('events').select('*').order('start_at', { ascending: true }).limit(20)),
          // Activity log — staff can read
          Promise.resolve(supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(15)),
          // Applications — only recruitment roles
          isRecruitment
            ? Promise.resolve(supabase.from('applications').select('*').order('created_at', { ascending: false }).limit(20))
            : Promise.resolve({ data: [], error: null }),
          // Interviews
          isRecruitment
            ? Promise.resolve(supabase.from('interviews').select('*').order('scheduled_at', { ascending: true }).limit(10))
            : Promise.resolve({ data: [], error: null }),
          // Enquiries — admin only
          canSeeEnquiries
            ? Promise.resolve(supabase.from('enquiries').select('*').order('created_at', { ascending: false }).limit(20))
            : Promise.resolve({ data: [], error: null }),
          // Invitations
          canSeeTeam
            ? Promise.resolve(supabase.from('invitations').select('*').order('created_at', { ascending: false }).limit(20))
            : Promise.resolve({ data: [], error: null }),
          // Team members
          canSeeTeam
            ? Promise.resolve(supabase.from('team_member_profiles').select('*').order('created_at', { ascending: false }))
            : Promise.resolve({ data: [], error: null }),
          // Jobs
          Promise.resolve(supabase.from('job_postings').select('*').order('updated_at', { ascending: false }).limit(20)),
          // Failed emails
          Promise.resolve(supabase.from('email_logs').select('*').eq('status', 'failed').order('created_at', { ascending: false }).limit(10)),
          // My tasks
          Promise.resolve(supabase.from('tasks').select('*').eq('assignee_id', uid).neq('status', 'completed').order('due_at', { ascending: true, nullsFirst: false }).limit(10)),
          // My crew assignments → events
          Promise.resolve(supabase.from('crew_assignments').select('event_id').eq('user_id', uid)),
          // Notifications
          Promise.resolve(supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)),
          // Preferences
          Promise.resolve(supabase.from('dashboard_preferences').select('*').eq('user_id', uid).maybeSingle()),
        ] as Promise<{ data: unknown }>[];

        const results = await Promise.all(queries);
        if (cancelled) return;

        const events = ((results[0] as { data: EventRow[] | null }).data) || [];
        const activity = ((results[1] as { data: ActivityLogRow[] | null }).data) || [];
        const applications = ((results[2] as { data: ApplicationRow[] | null }).data) || [];
        const interviews = ((results[3] as { data: InterviewRow[] | null }).data) || [];
        const enquiries = ((results[4] as { data: EnquiryRow[] | null }).data) || [];
        const invitations = ((results[5] as { data: InvitationRow[] | null }).data) || [];
        const members = ((results[6] as { data: TeamMemberProfileRow[] | null }).data) || [];
        const jobs = ((results[7] as { data: JobPostingRow[] | null }).data) || [];
        const emails = ((results[8] as { data: EmailLogRow[] | null }).data) || [];
        const tasks = ((results[9] as { data: TaskRow[] | null }).data) || [];
        const assignments = ((results[10] as { data: { event_id: string }[] | null }).data) || [];
        const notifs = ((results[11] as { data: NotificationRow[] | null }).data) || [];
        const prefs = (results[12] as { data: DashboardPreferencesRow | null }).data;

        // Calculate metrics from fetched data
        const upcomingEv = events.filter(e => e.start_at && new Date(e.start_at) > new Date(now) && ['announced', 'upcoming', 'sold_out'].includes(e.status));
        const pastEv = events.filter(e => e.start_at && new Date(e.start_at) < new Date(now));
        const draftEv = events.filter(e => !e.is_published || e.status === 'draft');
        const needsAttentionEv = events.filter(e =>
          (e.status === 'announced' || e.status === 'upcoming') &&
          (!e.venue_name || !e.start_at || !e.cover_image_url)
        );

        const newApps = applications.filter(a => a.status === 'submitted');
        const reviewApps = applications.filter(a => a.status === 'under_review');
        const approvedApps = applications.filter(a => a.status === 'approved');
        const scheduledInterviews = interviews.filter(i => i.status === 'scheduled' && new Date(i.scheduled_at) > new Date(now));

        const collaborationEnquiries = enquiries.filter(e => e.category === 'collaboration' || e.category === 'partnership');
        const collabNew = collaborationEnquiries.filter(e => e.status === 'new');
        const collabReview = collaborationEnquiries.filter(e => e.status === 'reviewing');
        const collabDiscussion = collaborationEnquiries.filter(e => e.status === 'in_discussion');
        const collabDecision = collaborationEnquiries.filter(e => e.status === 'accepted' || e.status === 'reviewing');

        const contactEnquiries = enquiries.filter(e => e.category !== 'collaboration' && e.category !== 'partnership');
        const enquiriesNew = contactEnquiries.filter(e => e.status === 'new');
        const enquiriesAwaiting = contactEnquiries.filter(e => e.status === 'new' || e.status === 'reviewing');
        const enquiriesResolved = contactEnquiries.filter(e => e.status === 'closed' || e.status === 'replied');

        const activeMembers = members.filter(m => m.account_status === 'active');
        const pendingInvites = invitations.filter(i => !i.activated_at && !i.revoked_at);

        const jobsPublished = jobs.filter(j => j.status === 'published');
        const jobsDraft = jobs.filter(j => j.status === 'draft');

        if (!cancelled) {
          setMetrics({
            eventsPublished: events.filter(e => e.is_published).length,
            eventsDraft: draftEv.length,
            eventsUpcoming: upcomingEv.length,
            eventsPast: pastEv.length,
            eventsNeedsAttention: needsAttentionEv.length,
            applicationsNew: newApps.length,
            applicationsUnderReview: reviewApps.length,
            interviewsScheduled: scheduledInterviews.length,
            applicationsApproved: approvedApps.length,
            collaborationNew: collabNew.length,
            collaborationUnderReview: collabReview.length,
            collaborationInDiscussion: collabDiscussion.length,
            collaborationAwaitingDecision: collabDecision.length,
            enquiriesNew: enquiriesNew.length,
            enquiriesAwaitingResponse: enquiriesAwaiting.length,
            enquiriesResolved: enquiriesResolved.length,
            teamActive: activeMembers.length,
            teamPendingInvites: pendingInvites.length,
            jobsPublished: jobsPublished.length,
            jobsDraft: jobsDraft.length,
            failedEmails: emails.length,
          });

          setUpcomingEvents(upcomingEv.slice(0, 6));
          setRecentActivity(activity);
          setFailedEmails(emails);
          setNotifications(notifs);
          setPreferences(prefs);
          setMyTasks(tasks);

          // My events from crew assignments
          const assignedEventIds = new Set(assignments.map(a => a.event_id));
          setMyEvents(events.filter(e => assignedEventIds.has(e.id)));

          // My applications (assigned reviewer)
          setMyApplications(applications.filter(a => a.assigned_reviewer === uid));

          // My enquiries (no assignment field yet — show recent if admin)
          setMyEnquiries(canSeeEnquiries ? enquiries.slice(0, 5) : []);

          // Build priority tasks
          const ptasks: PriorityTask[] = [];
          newApps.slice(0, 5).forEach(a => ptasks.push({
            id: `app-${a.id}`, type: 'application', title: a.full_name,
            subtitle: a.preferred_role || 'Application', status: a.status,
            created_at: a.created_at, due_at: null, link: `/admin/applications/${a.id}`,
            assignee: a.assigned_reviewer, priority: 'high',
          }));
          scheduledInterviews.slice(0, 3).forEach(i => ptasks.push({
            id: `int-${i.id}`, type: 'interview', title: i.interviewer_name || 'Interview',
            subtitle: `Scheduled ${new Date(i.scheduled_at).toLocaleDateString()}`, status: i.status,
            created_at: i.created_at, due_at: i.scheduled_at, link: '/admin/applications',
            assignee: null, priority: 'high',
          }));
          enquiriesNew.slice(0, 5).forEach(e => ptasks.push({
            id: `enq-${e.id}`, type: 'enquiry', title: e.full_name,
            subtitle: e.category || 'Enquiry', status: e.status,
            created_at: e.created_at, due_at: e.follow_up_at, link: '/admin/enquiries',
            assignee: null, priority: 'medium',
          }));
          needsAttentionEv.slice(0, 3).forEach(e => ptasks.push({
            id: `ev-${e.id}`, type: 'event', title: e.title,
            subtitle: 'Missing publication details', status: e.status,
            created_at: e.created_at, due_at: e.start_at, link: `/admin/events/${e.id}`,
            assignee: e.created_by, priority: 'medium',
          }));
          pendingInvites.slice(0, 5).forEach(i => ptasks.push({
            id: `inv-${i.id}`, type: 'invitation', title: i.email,
            subtitle: i.full_name || 'Pending invitation', status: 'pending',
            created_at: i.created_at, due_at: i.expires_at, link: '/admin/invitations',
            assignee: i.invited_by, priority: 'low',
          }));
          emails.slice(0, 3).forEach(e => ptasks.push({
            id: `email-${e.id}`, type: 'email', title: e.to_address,
            subtitle: e.subject || e.template_key || 'Email failed', status: 'failed',
            created_at: e.created_at, due_at: null, link: '/admin/templates',
            assignee: null, priority: 'medium',
          }));
          tasks.slice(0, 5).forEach(t => ptasks.push({
            id: `task-${t.id}`, type: 'task', title: t.title,
            subtitle: t.description || 'Task', status: t.status,
            created_at: t.created_at, due_at: t.due_at, link: '/admin/events',
            assignee: t.assignee_id, priority: t.priority,
          }));

          // Sort by priority then date
          const priOrder = { high: 0, medium: 1, low: 2 };
          ptasks.sort((a, b) => {
            const pc = priOrder[a.priority] - priOrder[b.priority];
            if (pc !== 0) return pc;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setPriorityTasks(ptasks.slice(0, 12));
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isStaff, user, isAdminOrOwner, role, memberProfile, refreshKey]);

  const markNotificationRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  }, [user]);

  const savePreferences = useCallback(async (prefs: Partial<DashboardPreferencesRow>) => {
    if (!user) return;
    const updated = { ...preferences, user_id: user.id, ...prefs, updated_at: new Date().toISOString() } as DashboardPreferencesRow;
    await supabase.from('dashboard_preferences').upsert(updated);
    setPreferences(updated);
  }, [user, preferences]);

  return {
    metrics, upcomingEvents, recentActivity, priorityTasks, notifications,
    myTasks, myEvents, myApplications, myEnquiries, failedEmails, preferences,
    loading, error, refresh, markNotificationRead, markAllNotificationsRead, savePreferences,
  };
}
