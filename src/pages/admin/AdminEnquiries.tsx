import { useEffect, useState, useCallback } from 'react';
import { Search, Inbox, Mail, Trash2, ChevronDown, Filter, ArrowUpDown, X, CheckCircle, Clock, AlertCircle, UserCog, StickyNote, Activity, Send, Link2, Phone, Building2, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { EnquiryRow, EnquiryCategoryRow, EnquiryNoteRow, EnquiryActivityRow, TeamMemberProfileRow } from '@/lib/types';
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS, ENQUIRY_PRIORITIES, ENQUIRY_PRIORITY_LABELS, ENQUIRY_PRIORITY_COLORS } from '@/lib/types';
import { formatDate, relativeTime } from '@/lib/format';

type EnquiryWithRelations = EnquiryRow & {
  category?: EnquiryCategoryRow | string | null;
  assignee?: { full_name: string; id: string } | null;
};

export function AdminEnquiries() {
  const { user, isStaff, isAdminOrOwner, isFounder } = useAuth();
  const [items, setItems] = useState<EnquiryWithRelations[]>([]);
  const [categories, setCategories] = useState<EnquiryCategoryRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfileRow[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [assignFilter, setAssignFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'updated'>('newest');
  const [sel, setSel] = useState<EnquiryWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    if (!isStaff) return;
    const [{ data: enq }, { data: cats }, { data: members }] = await Promise.all([
      supabase.from('enquiries').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('enquiry_categories').select('*').order('sort_order'),
      supabase.from('team_member_profiles').select('id, full_name, account_status, role_id').eq('account_status', 'active').order('full_name'),
    ]);
    setItems((enq as EnquiryRow[]) || []);
    setCategories((cats as EnquiryCategoryRow[]) || []);
    setTeamMembers((members as TeamMemberProfileRow[]) || []);
    setLoading(false);
  }, [isStaff]);

  useEffect(() => { loadData(); }, [loadData]);

  // Metrics
  const metrics = {
    total: items.length,
    new: items.filter(e => e.status === 'new').length,
    unassigned: items.filter(e => !e.assigned_to).length,
    inProgress: items.filter(e => ['in_progress', 'under_review', 'awaiting_response', 'reviewing', 'in_discussion'].includes(e.status)).length,
    awaiting: items.filter(e => e.status === 'awaiting_response').length,
    resolved: items.filter(e => ['resolved', 'closed', 'accepted'].includes(e.status)).length,
    today: items.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString()).length,
    urgent: items.filter(e => e.priority === 'urgent' && e.status !== 'resolved' && e.status !== 'archived').length,
  };

  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

  const filtered = items.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && e.priority !== priorityFilter) return false;
    if (catFilter !== 'all' && e.category_id !== catFilter) return false;
    if (assignFilter === 'unassigned' && e.assigned_to) return false;
    if (assignFilter === 'me' && e.assigned_to !== user?.id) return false;
    if (assignFilter !== 'all' && assignFilter !== 'unassigned' && assignFilter !== 'me' && e.assigned_to !== assignFilter) return false;
    if (q) {
      const s = `${e.reference_number || ''} ${e.full_name} ${e.email} ${e.subject || ''} ${e.message} ${e.category || ''}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'priority') return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    if (sortBy === 'updated') return new Date(b.last_updated_at || b.created_at).getTime() - new Date(a.last_updated_at || a.created_at).getTime();
    return 0;
  });

  async function markAsRead(e: EnquiryWithRelations) {
    if (e.read_at) return;
    const now = new Date().toISOString();
    await supabase.from('enquiries').update({ read_at: now }).eq('id', e.id);
    setItems(arr => arr.map(x => x.id === e.id ? { ...x, read_at: now } : x));
  }

  async function updateField(id: string, field: string, value: string) {
    const now = new Date().toISOString();
    await supabase.from('enquiries').update({ [field]: value, last_updated_at: now }).eq('id', id);
    setItems(arr => arr.map(e => e.id === id ? { ...e, [field]: value, last_updated_at: now } : e));
    setSel(s => s && s.id === id ? { ...s, [field]: value, last_updated_at: now } : s);
    // Log activity
    if (field === 'status') {
      await supabase.from('enquiry_activity').insert({ enquiry_id: id, actor_id: user?.id || null, action: 'status_change', detail: `Status changed to ${ENQUIRY_STATUS_LABELS[value] || value}` });
    } else if (field === 'priority') {
      await supabase.from('enquiry_activity').insert({ enquiry_id: id, actor_id: user?.id || null, action: 'priority_change', detail: `Priority changed to ${ENQUIRY_PRIORITY_LABELS[value] || value}` });
    } else if (field === 'assigned_to') {
      const member = teamMembers.find(m => m.id === value);
      await supabase.from('enquiry_activity').insert({ enquiry_id: id, actor_id: user?.id || null, action: 'assignment', detail: value ? `Assigned to ${member?.full_name || 'team member'}` : 'Unassigned' });
    }
  }

  async function deleteEnquiry(id: string) {
    if (!confirm('Delete this enquiry permanently? This cannot be undone.')) return;
    await supabase.from('enquiries').delete().eq('id', id);
    setItems(arr => arr.filter(e => e.id !== id));
    setSel(null);
  }

  if (!isStaff) return <div className="text-white/50">Staff access required.</div>;

  const statusColors: Record<string, string> = {
    new: 'bg-synf-500/15 text-synf-400 border-synf-500/30',
    under_review: 'bg-gold-400/10 text-gold-400 border-gold-400/30',
    reviewing: 'bg-gold-400/10 text-gold-400 border-gold-400/30',
    awaiting_response: 'bg-gold-400/10 text-gold-400 border-gold-400/30',
    in_progress: 'bg-acid-400/10 text-acid-400 border-acid-400/30',
    in_discussion: 'bg-acid-400/10 text-acid-400 border-acid-400/30',
    resolved: 'bg-acid-400/10 text-acid-400 border-acid-400/30',
    closed: 'bg-ink-800 text-ink-400 border-ink-700',
    archived: 'bg-ink-800 text-ink-400 border-ink-700',
    accepted: 'bg-acid-400/10 text-acid-400 border-acid-400/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Enquiries</h1>
          <p className="text-white/50">Manage contact form submissions and enquiries.</p>
        </div>
        <a href="/admin/contact-settings" className="btn-ghost text-sm">Contact Settings →</a>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <MetricCard label="Total" value={metrics.total} icon={Inbox} />
        <MetricCard label="New" value={metrics.new} icon={AlertCircle} color="text-synf-400" />
        <MetricCard label="Unassigned" value={metrics.unassigned} icon={UserCog} color="text-gold-400" />
        <MetricCard label="In Progress" value={metrics.inProgress} icon={Clock} color="text-acid-400" />
        <MetricCard label="Awaiting" value={metrics.awaiting} icon={Clock} color="text-gold-400" />
        <MetricCard label="Resolved" value={metrics.resolved} icon={CheckCircle} color="text-acid-400" />
        <MetricCard label="Today" value={metrics.today} icon={Inbox} />
      </div>

      {metrics.urgent > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300">
          <AlertCircle size={16} /> {metrics.urgent} urgent enquiry{metrics.urgent > 1 ? 'ies' : ''} need attention.
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input className="input pl-9" placeholder="Search by ref#, name, email, subject, message…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="input lg:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {ENQUIRY_STATUSES.map(s => <option key={s} value={s}>{ENQUIRY_STATUS_LABELS[s]}</option>)}
          <option value="reviewing">Reviewing</option>
          <option value="replied">Replied</option>
          <option value="in_discussion">In Discussion</option>
          <option value="accepted">Accepted</option>
          <option value="closed">Closed</option>
        </select>
        <select className="input lg:w-36" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="all">All priority</option>
          {ENQUIRY_PRIORITIES.map(p => <option key={p} value={p}>{ENQUIRY_PRIORITY_LABELS[p]}</option>)}
        </select>
        <select className="input lg:w-40" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
        </select>
        <select className="input lg:w-36" value={assignFilter} onChange={e => setAssignFilter(e.target.value)}>
          <option value="all">Anyone</option>
          <option value="unassigned">Unassigned</option>
          <option value="me">Assigned to me</option>
          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <select className="input lg:w-36" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="priority">Priority</option>
          <option value="updated">Last updated</option>
        </select>
      </div>

      {/* Inbox + Detail */}
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-ink-900" />
      ) : sorted.length === 0 ? (
        <div className="card p-10 text-center"><Inbox className="mx-auto h-10 w-10 text-ink-500" /><p className="mt-3 text-white/50">No enquiries match your filters.</p></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* List */}
          <div className="card divide-y divide-white/5 overflow-hidden lg:col-span-2">
            {sorted.map(e => {
              const pc = ENQUIRY_PRIORITY_COLORS[e.priority] || ENQUIRY_PRIORITY_COLORS.normal;
              const sc = statusColors[e.status] || statusColors.new;
              const cat = categories.find(c => c.id === e.category_id);
              return (
                <button key={e.id} onClick={() => { setSel(e); markAsRead(e); }} className={`flex w-full flex-col gap-1 p-4 text-left transition hover:bg-white/5 ${sel?.id === e.id ? 'bg-synf-500/10' : ''} ${!e.read_at && e.status === 'new' ? 'border-l-2 border-l-synf-500' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-synf-400">{e.reference_number || '—'}</span>
                    <span className={`chip border text-[10px] uppercase ${sc}`}>{ENQUIRY_STATUS_LABELS[e.status] || e.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{e.full_name}</span>
                    {!e.read_at && e.status === 'new' && <span className="h-2 w-2 shrink-0 rounded-full bg-synf-500" />}
                  </div>
                  <div className="text-sm text-white/60 truncate">{e.subject || e.message.slice(0, 60)}</div>
                  <div className="flex items-center gap-2 text-xs text-ink-500">
                    {cat && <span>{cat.display_name}</span>}
                    <span>·</span>
                    <span>{relativeTime(e.created_at)}</span>
                    <span className={`chip ml-auto border text-[10px] ${pc.border} ${pc.bg} ${pc.text}`}>{ENQUIRY_PRIORITY_LABELS[e.priority]}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          {sel && (
            <EnquiryDetail
              key={sel.id}
              enquiry={sel}
              categories={categories}
              teamMembers={teamMembers}
              isAdminOrOwner={isAdminOrOwner}
              isFounder={isFounder}
              currentUserId={user?.id || ''}
              onUpdate={updateField}
              onDelete={deleteEnquiry}
              onClose={() => setSel(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Inbox; color?: string }) {
  return (
    <div className="card p-3">
      <Icon size={14} className={color || 'text-white/40'} />
      <div className="mt-1 font-display text-2xl font-extrabold">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-ink-500">{label}</div>
    </div>
  );
}

function EnquiryDetail({ enquiry, categories, teamMembers, isAdminOrOwner, isFounder, currentUserId, onUpdate, onDelete, onClose }: {
  enquiry: EnquiryWithRelations;
  categories: EnquiryCategoryRow[];
  teamMembers: TeamMemberProfileRow[];
  isAdminOrOwner: boolean;
  isFounder: boolean;
  currentUserId: string;
  onUpdate: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<EnquiryNoteRow[]>([]);
  const [activity, setActivity] = useState<EnquiryActivityRow[]>([]);
  const [newNote, setNewNote] = useState('');
  const [tab, setTab] = useState<'details' | 'notes' | 'activity'>('details');
  const [emailLogs, setEmailLogs] = useState<{ id: string; status: string; subject: string; to_address: string; created_at: string; error: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: n }, { data: a }, { data: el }] = await Promise.all([
        supabase.from('enquiry_notes').select('*').eq('enquiry_id', enquiry.id).order('created_at', { ascending: false }),
        supabase.from('enquiry_activity').select('*').eq('enquiry_id', enquiry.id).order('created_at', { ascending: false }),
        supabase.from('email_logs').select('id, status, subject, to_address, created_at, error').or(`payload->>enquiryId.eq.${enquiry.id},payload->>referenceNumber.eq.${enquiry.reference_number}`).order('created_at', { ascending: false }).limit(10),
      ]);
      setNotes((n as EnquiryNoteRow[]) || []);
      setActivity((a as EnquiryActivityRow[]) || []);
      setEmailLogs((el as { id: string; status: string; subject: string; to_address: string; created_at: string; error: string | null }[]) || []);
    })();
  }, [enquiry.id, enquiry.reference_number]);

  async function addNote() {
    if (!newNote.trim()) return;
    const { data } = await supabase.from('enquiry_notes').insert({ enquiry_id: enquiry.id, author_id: currentUserId || null, body: newNote.trim() }).select('*').single();
    if (data) setNotes(arr => [data as EnquiryNoteRow, ...arr]);
    setNewNote('');
  }

  async function deleteNote(id: string) {
    await supabase.from('enquiry_notes').delete().eq('id', id);
    setNotes(arr => arr.filter(n => n.id !== id));
  }

  const cat = categories.find(c => c.id === enquiry.category_id);
  const pc = ENQUIRY_PRIORITY_COLORS[enquiry.priority] || ENQUIRY_PRIORITY_COLORS.normal;

  return (
    <div className="card flex flex-col p-5 lg:col-span-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-synf-400">{enquiry.reference_number}</span>
            <span className={`chip border text-[10px] uppercase ${pc.border} ${pc.bg} ${pc.text}`}>{ENQUIRY_PRIORITY_LABELS[enquiry.priority]}</span>
          </div>
          <h2 className="mt-1 font-display text-xl font-extrabold truncate">{enquiry.full_name}</h2>
          <p className="text-sm text-white/50">{formatDate(enquiry.created_at, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-white/40 hover:text-white lg:hidden"><X size={20} /></button>
      </div>

      {/* Controls */}
      {isAdminOrOwner && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-ink-500">Status</label>
            <select className="input mt-1 text-sm" value={enquiry.status} onChange={e => onUpdate(enquiry.id, 'status', e.target.value)}>
              {ENQUIRY_STATUSES.map(s => <option key={s} value={s}>{ENQUIRY_STATUS_LABELS[s]}</option>)}
              <option value="reviewing">Reviewing</option>
              <option value="replied">Replied</option>
              <option value="in_discussion">In Discussion</option>
              <option value="accepted">Accepted</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-ink-500">Priority</label>
            <select className="input mt-1 text-sm" value={enquiry.priority} onChange={e => onUpdate(enquiry.id, 'priority', e.target.value)}>
              {ENQUIRY_PRIORITIES.map(p => <option key={p} value={p}>{ENQUIRY_PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-ink-500">Assigned to</label>
            <select className="input mt-1 text-sm" value={enquiry.assigned_to || ''} onChange={e => onUpdate(enquiry.id, 'assigned_to', e.target.value)}>
              <option value="">Unassigned</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-white/5">
        {(['details', 'notes', 'activity'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm font-medium transition ${tab === t ? 'border-b-2 border-synf-500 text-synf-400' : 'text-white/50 hover:text-white'}`}>
            {t === 'details' && 'Details'}
            {t === 'notes' && `Notes (${notes.length})`}
            {t === 'activity' && 'Activity'}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1 overflow-y-auto">
        {tab === 'details' && (
          <div className="space-y-3 text-sm">
            <Field icon={Mail} label="Email" value={enquiry.email} link={`mailto:${enquiry.email}`} />
            {enquiry.phone && <Field icon={Phone} label="Phone" value={enquiry.phone} />}
            {enquiry.organization && <Field icon={Building2} label="Organization" value={enquiry.organization} />}
            {cat && <Field icon={MessageSquare} label="Category" value={cat.display_name} />}
            {enquiry.subject && <div><span className="text-ink-500">Subject</span><div className="mt-0.5 font-semibold text-white">{enquiry.subject}</div></div>}
            {enquiry.preferred_contact_method && <div><span className="text-ink-500">Preferred contact</span><div className="mt-0.5 capitalize text-white">{enquiry.preferred_contact_method}</div></div>}
            {enquiry.links && <Field icon={Link2} label="Links" value={enquiry.links} link={enquiry.links} />}
            {enquiry.brand && <div><span className="text-ink-500">Brand</span><div className="mt-0.5 text-white">{enquiry.brand}</div></div>}
            {enquiry.event_name && <div><span className="text-ink-500">Event</span><div className="mt-0.5 text-white">{enquiry.event_name}</div></div>}
            {enquiry.venue_city && <div><span className="text-ink-500">City</span><div className="mt-0.5 text-white">{enquiry.venue_city}</div></div>}
            {enquiry.budget_range && <div><span className="text-ink-500">Budget</span><div className="mt-0.5 text-white">{enquiry.budget_range}</div></div>}
            <div>
              <span className="text-ink-500">Message</span>
              <p className="mt-1 whitespace-pre-wrap rounded-lg border border-white/5 bg-ink-900/50 p-3 text-white/90">{enquiry.message}</p>
            </div>

            {/* Email delivery */}
            {emailLogs.length > 0 && (
              <div>
                <span className="text-ink-500">Email delivery</span>
                <div className="mt-1 space-y-1">
                  {emailLogs.map(el => (
                    <div key={el.id} className="flex items-center gap-2 text-xs">
                      <span className={el.status === 'sent' ? 'text-acid-400' : 'text-synf-400'}>{el.status === 'sent' ? '✓' : '✗'}</span>
                      <span className="text-white/60">{el.subject}</span>
                      <span className="text-ink-500">→ {el.to_address}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
              <a href={`mailto:${enquiry.email}?subject=Re: ${enquiry.subject || enquiry.reference_number || 'your enquiry to Team Synf'}`} className="btn-primary"><Mail size={14} /> Reply via email</a>
              {isAdminOrOwner && <button onClick={() => onDelete(enquiry.id)} className="btn-ghost text-synf-400"><Trash2 size={14} /> Delete</button>}
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <textarea className="input min-h-[60px] flex-1 text-sm" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add an internal note (visible to staff only)…" />
              <button onClick={addNote} className="btn-primary shrink-0"><StickyNote size={14} /> Add</button>
            </div>
            {notes.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">No internal notes yet.</p>
            ) : notes.map(n => (
              <div key={n.id} className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-500">{relativeTime(n.created_at)}</span>
                  {isAdminOrOwner && <button onClick={() => deleteNote(n.id)} className="text-xs text-white/30 hover:text-synf-400"><Trash2 size={12} /></button>}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">{n.body}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'activity' && (
          <div className="space-y-2">
            {activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">No activity recorded yet.</p>
            ) : activity.map(a => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-synf-500/50" />
                <div>
                  <span className="text-white/80">{a.detail || a.action}</span>
                  <span className="ml-2 text-xs text-ink-500">{relativeTime(a.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, link }: { icon: typeof Mail; label: string; value: string; link?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-ink-500"><Icon size={12} /> {label}</span>
      {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-synf-400 hover:underline">{value}</a> : <span className="text-right text-white">{value}</span>}
    </div>
  );
}
