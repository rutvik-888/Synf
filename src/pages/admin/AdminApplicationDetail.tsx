import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Calendar, XCircle, Clock, RotateCcw, Mail, FileText, User, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ApplicationRow, ApplicationStatus, FormField, InterviewRow, ApplicationStatusHistoryRow, EmailLogRow } from '@/lib/types';
import { APPLICATION_STATUS_LABELS } from '@/lib/types';
import { applicationAction } from '@/lib/api';
import { formatDateTime, formatDate, formatTime } from '@/lib/format';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  submitted: 'text-ink-300 bg-ink-800',
  under_review: 'text-gold-400 bg-gold-400/10',
  approved: 'text-acid-400 bg-acid-400/10',
  interview_invited: 'text-synf-300 bg-synf-500/15',
  rejected: 'text-synf-400 bg-synf-400/10',
  withdrawn: 'text-white/40 bg-white/5',
};

export function AdminApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canAct = role === 'owner' || role === 'admin' || role === 'recruitment_manager';

  const [app, setApp] = useState<ApplicationRow | null>(null);
  const [jobTitle, setJobTitle] = useState('Unknown Role');
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [history, setHistory] = useState<ApplicationStatusHistoryRow[]>([]);
  const [emails, setEmails] = useState<EmailLogRow[]>([]);
  const [notes, setNotes] = useState<{ id: string; body: string; author_id: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Dialog states
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCustom, setRejectCustom] = useState('');
  const [rejectEmailPreview, setRejectEmailPreview] = useState('');
  const [interview, setInterview] = useState({ scheduled_at: '', duration_minutes: '30', timezone: 'Asia/Kolkata', platform: 'Google Meet', meeting_link: '', instructions: '', interviewer_name: '' });
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: a } = await supabase.from('applications').select('*').eq('id', id).maybeSingle();
      setApp(a as ApplicationRow | null);
      if (a) {
        if ((a as ApplicationRow).job_id) {
          const { data: j } = await supabase.from('job_postings').select('title').eq('id', (a as ApplicationRow).job_id).maybeSingle();
          if (j) setJobTitle(j.title);
        }
        const { data: iv } = await supabase.from('interviews').select('*').eq('application_id', id).order('created_at', { ascending: false });
        setInterviews((iv as InterviewRow[]) || []);
        const { data: h } = await supabase.from('application_status_history').select('*').eq('application_id', id).order('created_at', { ascending: false });
        setHistory((h as ApplicationStatusHistoryRow[]) || []);
        const { data: em } = await supabase.from('email_logs').select('*').eq('application_id', id).order('created_at', { ascending: false });
        setEmails((em as EmailLogRow[]) || []);
        const { data: ns } = await supabase.from('application_notes').select('*').eq('application_id', id).order('created_at', { ascending: false });
        setNotes((ns as { id: string; body: string; author_id: string | null; created_at: string }[]) || []);
      }
      const { data: rr } = await supabase.from('site_content').select('data').eq('slug', 'rejection_reasons').maybeSingle();
      if (rr?.data && (rr.data as { reasons?: string[] }).reasons) setRejectionReasons((rr.data as { reasons: string[] }).reasons);
      setLoading(false);
    })();
  }, [id]);

  async function doAction(action: string, extra: Record<string, unknown> = {}) {
    if (!app) return;
    setActionLoading(true);
    const r = await applicationAction({ action: action as 'approve' | 'under_review' | 'invite_interview' | 'reschedule_interview' | 'cancel_interview' | 'reject' | 'retry_email', application_id: app.id, ...extra });
    setActionLoading(false);
    if (r.error) { setToast({ type: 'err', msg: r.error }); return; }
    if (r.email_sent === false) setToast({ type: 'err', msg: 'Action saved, but email could not be sent. You can retry from the communication history.' });
    else setToast({ type: 'ok', msg: 'Action completed successfully.' });

    // Refresh
    const { data: a } = await supabase.from('applications').select('*').eq('id', app.id).maybeSingle();
    setApp(a as ApplicationRow | null);
    const { data: h } = await supabase.from('application_status_history').select('*').eq('application_id', app.id).order('created_at', { ascending: false });
    setHistory((h as ApplicationStatusHistoryRow[]) || []);
    const { data: em } = await supabase.from('email_logs').select('*').eq('application_id', app.id).order('created_at', { ascending: false });
    setEmails((em as EmailLogRow[]) || []);
    const { data: iv } = await supabase.from('interviews').select('*').eq('application_id', app.id).order('created_at', { ascending: false });
    setInterviews((iv as InterviewRow[]) || []);
    setShowApprove(false); setShowReject(false); setShowInterview(false);
    setTimeout(() => setToast(null), 4000);
  }

  async function addNote(body: string) {
    if (!app || !body.trim()) return;
    const { data } = await supabase.from('application_notes').insert({ application_id: app.id, body: body.trim() }).select('*').single();
    if (data) setNotes(n => [data as typeof notes[0], ...n]);
  }

  async function retryEmail(logId: string) {
    setActionLoading(true);
    const r = await applicationAction({ action: 'retry_email', application_id: app!.id, email_log_id: logId });
    setActionLoading(false);
    if (r.error) setToast({ type: 'err', msg: r.error });
    else setToast({ type: 'ok', msg: 'Email retried.' });
    const { data: em } = await supabase.from('email_logs').select('*').eq('application_id', app!.id).order('created_at', { ascending: false });
    setEmails((em as EmailLogRow[]) || []);
    setTimeout(() => setToast(null), 4000);
  }

  if (loading) return <div className="h-32 animate-pulse rounded-lg bg-ink-900" />;
  if (!app) return <div className="text-white/50">Application not found. <Link to="/admin/applications" className="text-synf-400">Back to inbox</Link></div>;

  const fields: FormField[] = app.form_snapshot?.fields || [];
  const isFinal = app.status === 'approved' || app.status === 'rejected';

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/applications')} className="flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={16} /> Back to inbox</button>

      {toast && <div className={`rounded-lg border p-3 text-sm ${toast.type === 'ok' ? 'border-acid-400/30 bg-acid-400/10 text-acid-300' : 'border-synf-500/30 bg-synf-500/10 text-synf-300'}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-extrabold">{app.full_name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${STATUS_COLORS[app.status]}`}>{APPLICATION_STATUS_LABELS[app.status]}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/50">
            <span className="font-mono text-synf-300">{app.application_code}</span>
            <span>{jobTitle}</span>
            <span>Applied {formatDateTime(app.created_at)}</span>
          </div>
        </div>
        {canAct && (
          <div className="flex flex-wrap gap-2">
            {app.status === 'submitted' && <button onClick={() => doAction('under_review')} className="btn-ghost"><Clock size={14} /> Start Review</button>}
            {app.status === 'under_review' && <button onClick={() => setShowInterview(true)} className="btn-ghost text-synf-300"><Calendar size={14} /> Invite to Interview</button>}
            {!isFinal && <button onClick={() => setShowApprove(true)} className="btn-ghost text-acid-400"><CheckCircle size={14} /> Approve</button>}
            {!isFinal && <button onClick={() => setShowReject(true)} className="btn-ghost text-synf-400"><XCircle size={14} /> Reject</button>}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: answers */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-bold">Application Answers</h2>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div><span className="text-ink-500">Email</span> <a href={`mailto:${app.email}`} className="text-synf-400">{app.email}</a></div>
              {app.phone && <div><span className="text-ink-500">Phone</span> {app.phone}</div>}
              {app.instagram && <div><span className="text-ink-500">Instagram</span> {app.instagram}</div>}
              {app.city && <div><span className="text-ink-500">City</span> {app.city}</div>}
              {app.preferred_role && <div><span className="text-ink-500">Preferred role</span> {app.preferred_role}</div>}
            </div>
            {fields.map((f: FormField) => (
              <div key={f.id} className="rounded-lg border border-white/5 bg-ink-900/50 p-3">
                <div className="text-xs uppercase tracking-widest text-ink-500">{f.label}</div>
                <div className="mt-1 text-sm text-white/80 whitespace-pre-wrap">{renderAnswer(app.answers[f.id])}</div>
              </div>
            ))}
            {app.attachment_url && <div><span className="text-ink-500">Attachment</span> <a href={app.attachment_url} target="_blank" rel="noopener noreferrer" className="text-synf-400 underline">View file</a></div>}
            {app.rejection_reason && <div className="rounded-lg border border-synf-500/20 bg-synf-500/5 p-3"><div className="text-xs uppercase tracking-widest text-synf-400">Rejection reason</div><div className="mt-1 text-sm text-white/80">{app.rejection_reason}</div></div>}
          </div>

          {/* Interviews */}
          {interviews.length > 0 && (
            <div className="card space-y-3 p-5">
              <h2 className="font-display text-lg font-bold">Interviews</h2>
              {interviews.map(iv => (
                <div key={iv.id} className="rounded-lg border border-white/5 bg-ink-900/50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{formatDate(iv.scheduled_at)} · {formatTime(iv.scheduled_at)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${iv.status === 'cancelled' ? 'bg-synf-500/15 text-synf-400' : iv.status === 'rescheduled' ? 'bg-gold-400/10 text-gold-400' : 'bg-acid-400/10 text-acid-400'}`}>{iv.status}</span>
                  </div>
                  <div className="mt-1 text-white/60">{iv.duration_minutes} min · {iv.timezone}</div>
                  {iv.meeting_link && <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer" className="mt-1 block text-synf-400 underline truncate">{iv.meeting_link}</a>}
                  {iv.instructions && <div className="mt-2 text-white/50">{iv.instructions}</div>}
                  {iv.interviewer_name && <div className="mt-1 text-xs text-ink-500">Interviewer: {iv.interviewer_name}</div>}
                  {canAct && iv.status !== 'cancelled' && (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => { setInterview({ scheduled_at: iv.scheduled_at, duration_minutes: String(iv.duration_minutes), timezone: iv.timezone, platform: iv.platform || 'Google Meet', meeting_link: iv.meeting_link || '', instructions: iv.instructions || '', interviewer_name: iv.interviewer_name || '' }); setShowInterview(true); }} className="btn-ghost text-xs">Reschedule</button>
                      <button onClick={() => doAction('cancel_interview', { interview_id: iv.id })} disabled={actionLoading} className="btn-ghost text-xs text-synf-400">Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-bold">Reviewer Notes</h2>
            <NoteInput onAdd={addNote} />
            {notes.length === 0 ? <p className="text-sm text-ink-500">No notes yet.</p> : (
              <div className="space-y-2">
                {notes.map(n => <div key={n.id} className="rounded-lg border border-white/5 bg-ink-900/50 p-3 text-sm"><div className="text-white/80">{n.body}</div><div className="mt-1 text-xs text-ink-500">{formatDateTime(n.created_at)}</div></div>)}
              </div>
            )}
          </div>
        </div>

        {/* Right: history + emails */}
        <div className="space-y-6">
          <div className="card space-y-3 p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-widest text-ink-500">Status History</h2>
            <div className="space-y-2">
              {history.length === 0 ? <p className="text-xs text-ink-500">No history.</p> : history.map(h => (
                <div key={h.id} className="text-xs">
                  <div className="flex items-center gap-2"><span className="font-semibold text-white">{h.new_status.replace('_', ' ')}</span></div>
                  <div className="text-ink-500">{formatDateTime(h.created_at)}{h.note ? ` · ${h.note}` : ''}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-widest text-ink-500">Communication History</h2>
            <div className="space-y-2">
              {emails.length === 0 ? <p className="text-xs text-ink-500">No emails sent.</p> : emails.map(em => (
                <div key={em.id} className="rounded-lg border border-white/5 bg-ink-900/50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{em.template_key?.replace(/_/g, ' ') || 'Email'}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase ${em.status === 'sent' ? 'bg-acid-400/10 text-acid-400' : em.status === 'failed' ? 'bg-synf-500/15 text-synf-400' : 'bg-ink-700 text-ink-300'}`}>{em.status}</span>
                  </div>
                  <div className="mt-1 text-ink-500">To: {em.to_address}</div>
                  <div className="text-ink-500">{formatDateTime(em.created_at)}</div>
                  {em.error && <div className="mt-1 text-synf-400">{em.error}</div>}
                  {em.status === 'failed' && canAct && <button onClick={() => retryEmail(em.id)} disabled={actionLoading} className="mt-2 flex items-center gap-1 text-synf-400 hover:text-synf-300"><RotateCcw size={12} /> Retry email</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Approve dialog */}
      {showApprove && (
        <Modal title="Approve Application" onClose={() => setShowApprove(false)}>
          <p className="text-sm text-white/60">Approve <strong className="text-white">{app.full_name}</strong> for <strong className="text-white">{jobTitle}</strong>?</p>
          <p className="text-xs text-ink-500">Application ID: {app.application_code}</p>
          <p className="text-sm text-white/60">A welcome email will be sent to {app.email}. Approval does not create an admin account.</p>
          <div className="flex gap-2 pt-4">
            <button onClick={() => doAction('approve')} disabled={actionLoading} className="btn-primary text-acid-400"><CheckCircle size={16} /> Confirm Approval</button>
            <button onClick={() => setShowApprove(false)} className="btn-ghost">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Reject dialog */}
      {showReject && (
        <Modal title="Reject Application" onClose={() => setShowReject(false)}>
          <p className="text-sm text-white/60">Reject <strong className="text-white">{app.full_name}</strong> for <strong className="text-white">{jobTitle}</strong>?</p>
          <div>
            <label className="label">Rejection reason *</label>
            <select className="input" value={rejectReason} onChange={e => { setRejectReason(e.target.value); setRejectEmailPreview(`After careful review of your application, we're unable to move forward at this time.\n\nReason: ${e.target.value}`); }}>
              <option value="">Select a reason…</option>
              {rejectionReasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Custom reason (optional, replaces selected)</label>
            <textarea className="input min-h-[60px]" value={rejectCustom} onChange={e => { setRejectCustom(e.target.value); setRejectEmailPreview(`After careful review of your application, we're unable to move forward at this time.\n\nReason: ${e.target.value}`); }} placeholder="Or write a custom reason…" />
          </div>
          <div>
            <label className="label">Applicant-facing email preview</label>
            <textarea className="input min-h-[100px] text-xs" readOnly value={rejectEmailPreview || `After careful review of your application, we're unable to move forward at this time.\n\nReason: ${rejectReason || rejectCustom || '—'}`} />
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => doAction('reject', { rejection_reason: rejectCustom || rejectReason })} disabled={actionLoading || (!rejectReason && !rejectCustom)} className="btn-primary text-synf-400"><XCircle size={16} /> Confirm Rejection</button>
            <button onClick={() => setShowReject(false)} className="btn-ghost">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Interview dialog */}
      {showInterview && (
        <Modal title="Invite to Interview" onClose={() => setShowInterview(false)}>
          <div className="grid gap-3 text-sm text-white/60">
            <div><strong className="text-white">{app.full_name}</strong> · {app.application_code}</div>
            <div>Role: {jobTitle}</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Date & time *</label><input className="input" type="datetime-local" value={interview.scheduled_at} onChange={e => setInterview(s => ({ ...s, scheduled_at: e.target.value }))} /></div>
            <div><label className="label">Duration (min)</label><input className="input" type="number" value={interview.duration_minutes} onChange={e => setInterview(s => ({ ...s, duration_minutes: e.target.value }))} /></div>
            <div><label className="label">Time zone</label><input className="input" value={interview.timezone} onChange={e => setInterview(s => ({ ...s, timezone: e.target.value }))} /></div>
            <div><label className="label">Platform</label><input className="input" value={interview.platform} onChange={e => setInterview(s => ({ ...s, platform: e.target.value }))} /></div>
          </div>
          <div><label className="label">Meeting link *</label><input className="input" type="url" value={interview.meeting_link} onChange={e => setInterview(s => ({ ...s, meeting_link: e.target.value }))} placeholder="https://meet.google.com/…" /></div>
          <div><label className="label">Instructions for applicant</label><textarea className="input min-h-[60px]" value={interview.instructions} onChange={e => setInterview(s => ({ ...s, instructions: e.target.value }))} /></div>
          <div><label className="label">Interviewer name</label><input className="input" value={interview.interviewer_name} onChange={e => setInterview(s => ({ ...s, interviewer_name: e.target.value }))} /></div>
          <p className="text-xs text-ink-500">An invitation email will be sent to {app.email}.</p>
          <div className="flex gap-2 pt-4">
            <button onClick={() => doAction('invite_interview', { scheduled_at: interview.scheduled_at, duration_minutes: parseInt(interview.duration_minutes) || 30, timezone: interview.timezone, platform: interview.platform, meeting_link: interview.meeting_link, instructions: interview.instructions, interviewer_name: interview.interviewer_name })} disabled={actionLoading || !interview.scheduled_at || !interview.meeting_link} className="btn-primary"><Calendar size={16} /> Send Invitation</button>
            <button onClick={() => setShowInterview(false)} className="btn-ghost">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg space-y-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-display text-xl font-extrabold">{title}</h2><button onClick={onClose} className="text-white/40 hover:text-white">✕</button></div>
        {children}
      </div>
    </div>
  );
}

function NoteInput({ onAdd }: { onAdd: (body: string) => void }) {
  const [body, setBody] = useState('');
  return (
    <div className="flex gap-2">
      <input className="input flex-1" value={body} onChange={e => setBody(e.target.value)} placeholder="Add a private note…" onKeyDown={e => { if (e.key === 'Enter' && body.trim()) { onAdd(body); setBody(''); } }} />
      <button onClick={() => { if (body.trim()) { onAdd(body); setBody(''); } }} className="btn-ghost"><MessageSquare size={14} /></button>
    </div>
  );
}

function renderAnswer(v: unknown): string {
  if (v == null) return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}
