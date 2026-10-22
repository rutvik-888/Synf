import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Inbox, UserSquare, Users, Activity, Bell, Crown, Network, ShieldCheck,
  Briefcase, Mail, AlertCircle, ChevronRight, RefreshCw, CheckCircle2, Clock,
  ArrowRight, Sparkles, TrendingUp, AlertTriangle, Eye, FileText, Settings,
  CircleDot, X, Menu, LayoutDashboard, Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useDashboardData } from '@/lib/useDashboardData';
import { formatDate, formatTime, relativeTime } from '@/lib/format';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types';
import type { EventRow, ActivityLogRow } from '@/lib/types';
import type { PriorityTask, DashboardPreferencesRow } from '@/lib/types';

const MODULE_PERMISSION_MAP: Record<string, string> = {
  events: 'events', enquiries: 'contact_enquiries', applications: 'applications',
  team: 'team_accounts', invitations: 'crew_invitations', people: 'people',
  jobs: 'job_postings', roles: 'roles_permissions', security: 'security_settings',
  templates: 'email_templates', content: 'website_content', founder: 'founder_ownership',
};

export function AdminDashboard() {
  const { user, profile, memberProfile, role, isStaff, isAdminOrOwner, isFounder } = useAuth();
  const dash = useDashboardData();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = memberProfile?.display_name || memberProfile?.custom_title || profile?.full_name || user?.email || 'there';
  const roleLabel = memberProfile?.role_definition?.display_name || (role ? ROLE_LABELS[role] : 'Team Member');
  const department = memberProfile?.department?.name || null;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const unreadCount = dash.notifications.filter(n => !n.read_at).length;

  if (!isStaff) return <div className="py-20 text-center text-white/40">Not authorised.</div>;

  const m = dash.metrics;
  const compact = dash.preferences?.density === 'compact';
  const hidden = new Set(dash.preferences?.hidden_widgets || []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-synf-400">{greeting},</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{displayName}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-white/50">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-white/70">
              {isFounder && <Crown size={11} className="text-gold-400" />}
              {roleLabel}
            </span>
            {department && <span className="text-xs text-ink-500">{department}</span>}
            <span className="text-ink-600">·</span>
            <span className="text-xs text-ink-500">{today}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={dash.refresh}
            disabled={dash.loading}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:border-synf-500/40 hover:text-white disabled:opacity-40"
          >
            <RefreshCw size={14} className={dash.loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <div className="relative">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="relative flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:border-synf-500/40 hover:text-white"
            >
              <Bell size={14} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-synf-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>
              )}
            </button>
            {notifOpen && (
              <NotificationsPanel
                notifications={dash.notifications}
                onClose={() => setNotifOpen(false)}
                onRead={dash.markNotificationRead}
                onReadAll={dash.markAllNotificationsRead}
              />
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-white/70 transition hover:border-synf-500/40"
            >
              {displayName.charAt(0).toUpperCase()}
            </button>
            {profileOpen && <ProfileMenu displayName={displayName} roleLabel={roleLabel} onClose={() => setProfileOpen(false)} />}
          </div>
        </div>
      </div>

      {dash.error && (
        <div className="flex items-center gap-3 rounded-xl border border-synf-500/30 bg-synf-500/10 p-4 text-sm text-synf-300">
          <AlertCircle size={16} /> {dash.error}
          <button onClick={dash.refresh} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {/* Metrics Overview */}
      {!hidden.has('metrics') && (
        <MetricsSection metrics={m} loading={dash.loading} isAdminOrOwner={isAdminOrOwner} isFounder={isFounder} role={role} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Priority Actions — spans 2 cols */}
        {!hidden.has('priority') && (
          <section className="card lg:col-span-2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
                <Zap size={16} className="text-synf-400" /> Needs Your Attention
              </h2>
              <span className="text-xs text-ink-500">{dash.priorityTasks.length} items</span>
            </div>
            <PriorityTasksList tasks={dash.priorityTasks} loading={dash.loading} />
          </section>
        )}

        {/* Quick Actions */}
        {!hidden.has('quickActions') && (
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold">
              <Sparkles size={16} className="text-synf-400" /> Quick Actions
            </h2>
            <QuickActions role={role} isFounder={isFounder} isAdminOrOwner={isAdminOrOwner} />
          </section>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Events */}
        {!hidden.has('upcomingEvents') && (
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
                <CalendarDays size={16} className="text-synf-400" /> Upcoming Events
              </h2>
              <Link to="/admin/events" className="text-xs text-synf-400 hover:underline">View all →</Link>
            </div>
            <UpcomingEvents events={dash.upcomingEvents} loading={dash.loading} role={role} />
          </section>
        )}

        {/* Recent Activity */}
        {!hidden.has('activity') && (
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
                <Activity size={16} className="text-synf-400" /> Recent Activity
              </h2>
            </div>
            <ActivityFeed activity={dash.recentActivity} loading={dash.loading} />
          </section>
        )}
      </div>

      {/* My Work */}
      {!hidden.has('myWork') && (dash.myTasks.length > 0 || dash.myEvents.length > 0 || dash.myApplications.length > 0) && (
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold">
            <CircleDot size={16} className="text-acid-400" /> My Work
          </h2>
          <MyWork
            tasks={dash.myTasks}
            events={dash.myEvents}
            applications={dash.myApplications}
            loading={dash.loading}
          />
        </section>
      )}

      {/* Analytics + System Notices */}
      <div className="grid gap-6 lg:grid-cols-2">
        {!hidden.has('analytics') && (
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold">
              <TrendingUp size={16} className="text-synf-400" /> Pipeline Overview
            </h2>
            <PipelineAnalytics metrics={m} loading={dash.loading} />
          </section>
        )}

        {!hidden.has('notices') && (
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold">
              <AlertTriangle size={16} className="text-gold-400" /> System Notices
            </h2>
            <SystemNotices metrics={m} failedEmails={dash.failedEmails} loading={dash.loading} isFounder={isFounder} />
          </section>
        )}
      </div>

      {/* Customization bar */}
      <CustomizationBar preferences={dash.preferences} onSave={dash.savePreferences} />
    </div>
  );
}

// ============================================================
// Metrics Section
// ============================================================
function MetricsSection({ metrics, loading, isAdminOrOwner, isFounder, role }: {
  metrics: ReturnType<typeof useDashboardData>['metrics'];
  loading: boolean; isAdminOrOwner: boolean; isFounder: boolean; role: string | null;
}) {
  if (!metrics) return <MetricsSkeleton />;

  const cards: { label: string; value: number; icon: typeof CalendarDays; to: string; show: boolean; accent?: string }[] = [
    { label: 'Upcoming Events', value: metrics.eventsUpcoming, icon: CalendarDays, to: '/admin/events', show: true, accent: 'synf' },
    { label: 'Draft Events', value: metrics.eventsDraft, icon: FileText, to: '/admin/events', show: true },
    { label: 'Past Events', value: metrics.eventsPast, icon: CalendarDays, to: '/admin/events', show: true },
    { label: 'Events Needing Attention', value: metrics.eventsNeedsAttention, icon: AlertTriangle, to: '/admin/events', show: true, accent: 'gold' },
    { label: 'New Applications', value: metrics.applicationsNew, icon: UserSquare, to: '/admin/applications', show: role === 'founder' || role === 'owner' || role === 'co_founder' || role === 'hr_manager' || role === 'admin' || role === 'event_manager', accent: 'synf' },
    { label: 'Under Review', value: metrics.applicationsUnderReview, icon: Eye, to: '/admin/applications', show: role === 'founder' || role === 'owner' || role === 'co_founder' || role === 'hr_manager' || role === 'admin' || role === 'event_manager' },
    { label: 'Interviews Scheduled', value: metrics.interviewsScheduled, icon: Clock, to: '/admin/applications', show: role === 'founder' || role === 'owner' || role === 'co_founder' || role === 'hr_manager' || role === 'admin' || role === 'event_manager' },
    { label: 'Approved Applicants', value: metrics.applicationsApproved, icon: CheckCircle2, to: '/admin/applications', show: role === 'founder' || role === 'owner' || role === 'co_founder' || role === 'hr_manager' || role === 'admin' },
    { label: 'New Enquiries', value: metrics.enquiriesNew, icon: Inbox, to: '/admin/enquiries', show: isAdminOrOwner, accent: 'synf' },
    { label: 'Awaiting Response', value: metrics.enquiriesAwaitingResponse, icon: AlertCircle, to: '/admin/enquiries', show: isAdminOrOwner },
    { label: 'Collaboration Proposals', value: metrics.collaborationNew, icon: Network, to: '/admin/enquiries', show: isAdminOrOwner },
    { label: 'Active Team Members', value: metrics.teamActive, icon: Users, to: '/admin/team', show: isAdminOrOwner, accent: 'acid' },
    { label: 'Pending Invitations', value: metrics.teamPendingInvites, icon: Mail, to: '/admin/invitations', show: isAdminOrOwner },
    { label: 'Published Jobs', value: metrics.jobsPublished, icon: Briefcase, to: '/admin/jobs', show: isAdminOrOwner || role === 'hr_manager' },
  ];

  const visible = cards.filter(c => c.show);
  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {visible.map((c, i) => {
        const Icon = c.icon;
        const accentColor = c.accent === 'synf' ? 'text-synf-400' : c.accent === 'gold' ? 'text-gold-400' : c.accent === 'acid' ? 'text-acid-400' : 'text-white/50';
        return (
          <Link key={i} to={c.to} className="card group p-4 transition hover:border-synf-500/30">
            <div className="flex items-center justify-between">
              <Icon size={16} className={accentColor} />
              <ChevronRight size={12} className="text-ink-600 transition group-hover:text-synf-400" />
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold">{loading ? '–' : c.value}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-500">{c.label}</div>
          </Link>
        );
      })}
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="card animate-pulse p-4">
          <div className="h-4 w-4 rounded bg-white/10" />
          <div className="mt-3 h-7 w-12 rounded bg-white/10" />
          <div className="mt-1.5 h-3 w-20 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Priority Tasks
// ============================================================
function PriorityTasksList({ tasks, loading }: { tasks: ReturnType<typeof useDashboardData>['priorityTasks']; loading: boolean }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />)}</div>;
  if (tasks.length === 0) return <EmptyState label="Nothing needs attention right now." icon={CheckCircle2} />;

  const typeIcon: Record<string, typeof CalendarDays> = {
    application: UserSquare, enquiry: Inbox, event: CalendarDays,
    interview: Clock, invitation: Mail, email: AlertCircle, task: CheckCircle2,
  };
  const typeColor: Record<string, string> = {
    application: 'text-synf-400', enquiry: 'text-acid-400', event: 'text-synf-400',
    interview: 'text-gold-400', invitation: 'text-white/50', email: 'text-synf-500', task: 'text-acid-400',
  };
  const priBadge: Record<string, string> = {
    high: 'bg-synf-500/15 text-synf-400 border-synf-500/30',
    medium: 'bg-gold-400/10 text-gold-400/80 border-gold-400/20',
    low: 'bg-white/5 text-ink-400 border-white/10',
  };

  return (
    <ul className="space-y-1.5">
      {tasks.map(t => {
        const Icon = typeIcon[t.type] || CircleDot;
        return (
          <li key={t.id}>
            <Link to={t.link} className="group flex items-center gap-3 rounded-lg border border-white/5 p-3 transition hover:border-synf-500/30 hover:bg-white/[0.02]">
              <Icon size={16} className={`${typeColor[t.type] || 'text-white/50'} shrink-0`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{t.title}</div>
                <div className="truncate text-xs text-ink-500">{t.subtitle} · {relativeTime(t.created_at)}</div>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${priBadge[t.priority]}`}>{t.priority}</span>
              <ChevronRight size={14} className="shrink-0 text-ink-600 transition group-hover:text-synf-400" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ============================================================
// Quick Actions
// ============================================================
function QuickActions({ role, isFounder, isAdminOrOwner }: { role: string | null; isFounder: boolean; isAdminOrOwner: boolean }) {
  const actions: { label: string; icon: typeof CalendarDays; to: string; show: boolean }[] = [
    { label: 'Create Event', icon: CalendarDays, to: '/admin/events/new', show: true },
    { label: 'Review Applications', icon: UserSquare, to: '/admin/applications', show: role === 'founder' || role === 'owner' || role === 'co_founder' || role === 'hr_manager' || role === 'admin' || role === 'event_manager' },
    { label: 'Open Enquiries', icon: Inbox, to: '/admin/enquiries', show: isAdminOrOwner },
    { label: 'Invite Member', icon: Mail, to: '/admin/invitations', show: isAdminOrOwner },
    { label: 'People Directory', icon: Users, to: '/admin/people', show: true },
    { label: 'Manage Jobs', icon: Briefcase, to: '/admin/jobs', show: isAdminOrOwner || role === 'hr_manager' },
    { label: 'Roles & Permissions', icon: ShieldCheck, to: '/admin/roles', show: isAdminOrOwner },
    { label: 'Email Templates', icon: Mail, to: '/admin/templates', show: isAdminOrOwner || role === 'hr_manager' },
    { label: 'Security', icon: ShieldCheck, to: '/admin/security', show: isAdminOrOwner },
    { label: 'Founder & Ownership', icon: Crown, to: '/admin/founder', show: isFounder },
    { label: 'Edit Content', icon: FileText, to: '/admin/content', show: isAdminOrOwner },
  ];
  const visible = actions.filter(a => a.show);
  return (
    <div className="grid grid-cols-2 gap-2">
      {visible.map((a, i) => {
        const Icon = a.icon;
        return (
          <Link key={i} to={a.to} className="group flex flex-col items-start gap-2 rounded-lg border border-white/5 p-3 transition hover:border-synf-500/30 hover:bg-white/[0.02]">
            <Icon size={16} className="text-synf-400" />
            <span className="text-xs font-semibold text-white/70 group-hover:text-white">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

// ============================================================
// Upcoming Events
// ============================================================
function UpcomingEvents({ events, loading, role }: { events: EventRow[]; loading: boolean; role: string | null }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-white/5" />)}</div>;
  if (events.length === 0) return <EmptyState label="No upcoming events scheduled." icon={CalendarDays} action={<Link to="/admin/events/new" className="btn-primary mt-3 text-xs">Create Event</Link>} />;

  const statusColor: Record<string, string> = {
    announced: 'text-synf-400 bg-synf-500/10', upcoming: 'text-acid-400 bg-acid-400/10',
    sold_out: 'text-gold-400 bg-gold-400/10', draft: 'text-ink-400 bg-white/5',
  };

  return (
    <ul className="space-y-2">
      {events.map(e => (
        <li key={e.id}>
          <Link to={`/admin/events/${e.id}`} className="group flex items-center gap-3 rounded-lg border border-white/5 p-3 transition hover:border-synf-500/30">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-800">
              {e.cover_image_url ? <img src={e.cover_image_url} alt={e.cover_image_alt || e.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center"><CalendarDays size={16} className="text-ink-600" /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{e.title}</div>
              <div className="truncate text-xs text-ink-500">
                {formatDate(e.start_at)} {e.start_at && `· ${formatTime(e.start_at)}`}
                {e.venue_city && ` · ${e.venue_city}`}
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor[e.status] || 'text-ink-400 bg-white/5'}`}>{e.status}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// Activity Feed
// ============================================================
function ActivityFeed({ activity, loading }: { activity: ActivityLogRow[]; loading: boolean }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />)}</div>;
  if (activity.length === 0) return <EmptyState label="No activity recorded yet." icon={Activity} />;

  const actionColor: Record<string, string> = {
    create: 'text-acid-400', publish: 'text-synf-400', update: 'text-white/60',
    delete: 'text-synf-500', signup: 'text-gold-400', approve: 'text-acid-400',
    reject: 'text-synf-500', invite: 'text-synf-400',
  };

  return (
    <ul className="space-y-1">
      {activity.map(a => (
        <li key={a.id} className="flex items-start gap-3 rounded-lg p-2.5 transition hover:bg-white/[0.02]">
          <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-synf-400" />
          <div className="min-w-0 flex-1">
            <div className="text-sm">
              <span className={`font-semibold ${actionColor[a.action] || 'text-white/70'}`}>{a.action.replace(/_/g, ' ')}</span>
              {a.summary && <span className="text-white/50"> · {a.summary}</span>}
            </div>
            <div className="text-xs text-ink-600">{relativeTime(a.created_at)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// My Work
// ============================================================
function MyWork({ tasks, events, applications, loading }: {
  tasks: ReturnType<typeof useDashboardData>['myTasks'];
  events: EventRow[]; applications: ReturnType<typeof useDashboardData>['myApplications']; loading: boolean;
}) {
  if (loading) return <div className="h-20 animate-pulse rounded-lg bg-white/5" />;
  if (tasks.length === 0 && events.length === 0 && applications.length === 0) {
    return <EmptyState label="Nothing assigned to you right now." icon={CircleDot} />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {tasks.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">My Tasks ({tasks.length})</h3>
          <ul className="space-y-1.5">
            {tasks.slice(0, 4).map(t => (
              <li key={t.id} className="rounded-lg border border-white/5 p-2.5 text-sm">
                <div className="truncate font-semibold">{t.title}</div>
                <div className="text-xs text-ink-500">{t.status} {t.due_at && `· due ${formatDate(t.due_at)}`}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {events.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">My Events ({events.length})</h3>
          <ul className="space-y-1.5">
            {events.slice(0, 4).map(e => (
              <li key={e.id}>
                <Link to={`/admin/events/${e.id}`} className="block rounded-lg border border-white/5 p-2.5 text-sm transition hover:border-synf-500/30">
                  <div className="truncate font-semibold">{e.title}</div>
                  <div className="text-xs text-ink-500">{formatDate(e.start_at)}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {applications.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">My Reviews ({applications.length})</h3>
          <ul className="space-y-1.5">
            {applications.slice(0, 4).map(a => (
              <li key={a.id}>
                <Link to={`/admin/applications/${a.id}`} className="block rounded-lg border border-white/5 p-2.5 text-sm transition hover:border-synf-500/30">
                  <div className="truncate font-semibold">{a.full_name}</div>
                  <div className="text-xs text-ink-500">{a.status}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Pipeline Analytics (text-based, no fake charts)
// ============================================================
function PipelineAnalytics({ metrics, loading }: { metrics: ReturnType<typeof useDashboardData>['metrics']; loading: boolean }) {
  if (loading || !metrics) return <div className="h-24 animate-pulse rounded-lg bg-white/5" />;

  const stages = [
    { label: 'New Applications', value: metrics.applicationsNew, color: 'synf' },
    { label: 'Under Review', value: metrics.applicationsUnderReview, color: 'gold' },
    { label: 'Interviews', value: metrics.interviewsScheduled, color: 'acid' },
    { label: 'Approved', value: metrics.applicationsApproved, color: 'acid' },
  ];
  const eventStages = [
    { label: 'Draft', value: metrics.eventsDraft, color: 'white' },
    { label: 'Upcoming', value: metrics.eventsUpcoming, color: 'synf' },
    { label: 'Past', value: metrics.eventsPast, color: 'ink' },
  ];

  const barColor: Record<string, string> = { synf: 'bg-synf-500', gold: 'bg-gold-400', acid: 'bg-acid-400', white: 'bg-white/50', ink: 'bg-ink-600' };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">Recruitment Pipeline</h3>
        <div className="space-y-2">
          {stages.map(s => {
            const total = stages.reduce((a, b) => a + b.value, 0) || 1;
            const pct = Math.round((s.value / total) * 100);
            return (
              <div key={s.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">{s.label}</span>
                  <span className="font-bold">{s.value}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${barColor[s.color]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">Events Distribution</h3>
        <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
          {eventStages.map(s => {
            const total = eventStages.reduce((a, b) => a + b.value, 0) || 1;
            return <div key={s.label} className={barColor[s.color]} style={{ width: `${(s.value / total) * 100}%` }} />;
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {eventStages.map(s => <span key={s.label} className="flex items-center gap-1.5 text-white/50"><span className={`h-2 w-2 rounded-full ${barColor[s.color]}`} /> {s.label} ({s.value})</span>)}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// System Notices
// ============================================================
function SystemNotices({ metrics, failedEmails, loading, isFounder }: {
  metrics: ReturnType<typeof useDashboardData>['metrics']; failedEmails: ReturnType<typeof useDashboardData>['failedEmails'];
  loading: boolean; isFounder: boolean;
}) {
  if (loading) return <div className="h-24 animate-pulse rounded-lg bg-white/5" />;
  if (!metrics) return <EmptyState label="No notices." icon={CheckCircle2} />;

  const notices: { severity: 'warn' | 'info'; title: string; desc: string; link?: string }[] = [];

  if (metrics.failedEmails > 0) {
    notices.push({ severity: 'warn', title: `${metrics.failedEmails} failed email${metrics.failedEmails > 1 ? 's' : ''}`, desc: 'Email delivery requires attention.', link: '/admin/templates' });
  }
  if (metrics.eventsNeedsAttention > 0) {
    notices.push({ severity: 'warn', title: `${metrics.eventsNeedsAttention} event${metrics.eventsNeedsAttention > 1 ? 's' : ''} missing details`, desc: 'Upcoming events lack venue, date, or cover image.', link: '/admin/events' });
  }
  if (metrics.teamPendingInvites > 0) {
    notices.push({ severity: 'info', title: `${metrics.teamPendingInvites} pending invitation${metrics.teamPendingInvites > 1 ? 's' : ''}`, desc: 'Awaiting acceptance.', link: '/admin/invitations' });
  }
  if (isFounder && metrics.eventsDraft > 0) {
    notices.push({ severity: 'info', title: `${metrics.eventsDraft} draft event${metrics.eventsDraft > 1 ? 's' : ''}`, desc: 'Ready to review and publish.', link: '/admin/events' });
  }

  if (notices.length === 0) return <EmptyState label="All systems healthy. No issues detected." icon={CheckCircle2} />;

  return (
    <ul className="space-y-2">
      {notices.map((n, i) => (
        <li key={i}>
          {n.link ? (
            <Link to={n.link} className="group flex items-start gap-3 rounded-lg border border-white/5 p-3 transition hover:border-synf-500/30">
              {n.severity === 'warn'
                ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold-400" />
                : <AlertCircle size={15} className="mt-0.5 shrink-0 text-synf-400" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="text-xs text-ink-500">{n.desc}</div>
              </div>
              <ChevronRight size={14} className="shrink-0 text-ink-600 group-hover:text-synf-400" />
            </Link>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-white/5 p-3">
              {n.severity === 'warn' ? <AlertTriangle size={15} className="mt-0.5 text-gold-400" /> : <AlertCircle size={15} className="mt-0.5 text-synf-400" />}
              <div><div className="text-sm font-semibold">{n.title}</div><div className="text-xs text-ink-500">{n.desc}</div></div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// Notifications Panel
// ============================================================
function NotificationsPanel({ notifications, onClose, onRead, onReadAll }: {
  notifications: ReturnType<typeof useDashboardData>['notifications'];
  onClose: () => void; onRead: (id: string) => void; onReadAll: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/5 p-3">
          <span className="text-sm font-bold">Notifications</span>
          <div className="flex items-center gap-2">
            <button onClick={onReadAll} className="text-xs text-synf-400 hover:underline">Mark all read</button>
            <button onClick={onClose}><X size={14} className="text-ink-500 hover:text-white" /></button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-500">No notifications</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {notifications.map(n => (
                <li key={n.id} className={`p-3 transition hover:bg-white/[0.02] ${!n.read_at ? 'bg-synf-500/[0.03]' : ''}`}>
                  <button onClick={() => { onRead(n.id); if (n.link) window.location.hash = n.link; }} className="block w-full text-left">
                    <div className="flex items-start gap-2">
                      {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-synf-400" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white/80">{n.title}</div>
                        {n.body && <div className="text-xs text-ink-500">{n.body}</div>}
                        <div className="mt-0.5 text-[10px] text-ink-600">{relativeTime(n.created_at)}</div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// Profile Menu
// ============================================================
function ProfileMenu({ displayName, roleLabel, onClose }: { displayName: string; roleLabel: string; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-white/10 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-white/5 p-3">
          <div className="text-sm font-bold">{displayName}</div>
          <div className="text-xs text-ink-500">{roleLabel}</div>
        </div>
        <div className="py-1">
          <Link to="/admin/security" onClick={onClose} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"><Settings size={14} /> Account Settings</Link>
          <Link to="/admin/team" onClick={onClose} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"><Network size={14} /> Team Profile</Link>
        </div>
        <div className="border-t border-white/5 pt-1">
          <Link to="/" onClick={onClose} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"><ArrowRight size={14} /> View Website</Link>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Customization Bar
// ============================================================
const ALL_WIDGETS = ['metrics', 'priority', 'quickActions', 'upcomingEvents', 'activity', 'myWork', 'analytics', 'notices'];
const WIDGET_LABELS: Record<string, string> = {
  metrics: 'Metrics', priority: 'Priority Tasks', quickActions: 'Quick Actions',
  upcomingEvents: 'Upcoming Events', activity: 'Activity Feed', myWork: 'My Work',
  analytics: 'Pipeline', notices: 'System Notices',
};

function CustomizationBar({ preferences, onSave }: {
  preferences: ReturnType<typeof useDashboardData>['preferences'];
  onSave: (prefs: Partial<DashboardPreferencesRow>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const hidden = new Set(preferences?.hidden_widgets || []);

  async function toggleWidget(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key); else next.add(key);
    await onSave({ hidden_widgets: Array.from(next) });
  }

  async function setDensity(d: 'compact' | 'comfortable') {
    await onSave({ density: d });
  }

  async function reset() {
    await onSave({ hidden_widgets: [], widget_order: [], density: 'comfortable' });
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-900/30 px-4 py-2.5">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 text-xs text-ink-500 hover:text-white/70">
        <LayoutDashboard size={13} /> Customize dashboard
      </button>
      <span className="text-[10px] text-ink-600">Tip: ⌘K to search</span>
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
      {open && (
        <div className="absolute bottom-16 left-4 z-50 w-72 rounded-xl border border-white/10 bg-ink-900/95 p-4 shadow-2xl backdrop-blur-xl" style={{ position: 'fixed' }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold">Dashboard Settings</span>
            <button onClick={() => setOpen(false)}><X size={14} className="text-ink-500" /></button>
          </div>
          <div className="mb-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">Widgets</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_WIDGETS.map(w => (
                <button key={w} onClick={() => toggleWidget(w)} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition ${hidden.has(w) ? 'border-white/5 text-ink-600' : 'border-synf-500/20 text-white/70'}`}>
                  <span className={`h-2 w-2 rounded-full ${hidden.has(w) ? 'bg-ink-700' : 'bg-synf-400'}`} />
                  {WIDGET_LABELS[w]}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">Density</div>
            <div className="flex gap-2">
              {(['comfortable', 'compact'] as const).map(d => (
                <button key={d} onClick={() => setDensity(d)} className={`rounded-lg border px-3 py-1.5 text-xs capitalize transition ${(preferences?.density || 'comfortable') === d ? 'border-synf-500/30 text-synf-400' : 'border-white/5 text-ink-500'}`}>{d}</button>
              ))}
            </div>
          </div>
          <button onClick={reset} className="text-xs text-synf-400 hover:underline">Reset to default</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================
function EmptyState({ label, icon: Icon, action }: { label: string; icon: typeof CalendarDays; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon size={24} className="text-ink-700" />
      <p className="mt-2 text-sm text-ink-500">{label}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
