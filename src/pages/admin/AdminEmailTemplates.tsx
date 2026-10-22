import { useEffect, useState } from 'react';
import { Save, Eye, Send } from 'lucide-react';
import { supabase, SUPABASE_URL } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { EmailTemplateRow } from '@/lib/types';

const TEMPLATE_LABELS: Record<string, string> = {
  application_acknowledgement: 'Application Acknowledgement',
  application_internal_notify: 'Internal New-Application Notification',
  application_approval: 'Approval & Welcome',
  interview_invitation: 'Interview Invitation',
  interview_rescheduled: 'Interview Rescheduled',
  interview_cancelled: 'Interview Cancelled',
  application_rejection: 'Application Rejection',
  request_additional_info: 'Request Additional Info',
  enquiry_acknowledgement: 'Enquiry Acknowledgement (Visitor)',
  enquiry_internal_notify: 'Enquiry Internal Notification',
};

const ALL_KEYS = Object.keys(TEMPLATE_LABELS);

const SAMPLE_DATA: Record<string, string> = {
  applicant_name: 'Aarav Sharma',
  job_title: 'Event Operations Crew',
  application_id: '#SYNF-APP-000001',
  submission_date: 'Monday, October 20, 2026',
  interview_date: 'Friday, October 24, 2026',
  interview_time: '4:00 PM',
  timezone: 'Asia/Kolkata',
  interview_duration: '30',
  meeting_link: 'https://meet.google.com/abc-defg-hij',
  rejection_reason: 'Experience does not currently match the role',
  additional_instructions: 'Please bring your portfolio.',
  contact_email: 'synf.c@com.gh',
};

export function AdminEmailTemplates() {
  const { role, isAdminOrOwner } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [selKey, setSelKey] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('email_templates').select('*').order('key');
      setTemplates((data as EmailTemplateRow[]) || []);
      if (data && data.length > 0) {
        const first = (data as EmailTemplateRow[])[0];
        setSelKey(first.key); setSubject(first.subject); setBody(first.body);
      }
    })();
  }, []);

  function selectTemplate(key: string) {
    const t = templates.find(t => t.key === key);
    if (t) { setSelKey(key); setSubject(t.subject); setBody(t.body); setPreviewMode(false); }
  }

  async function save() {
    if (!selKey) return;
    setSaving(true);
    const { error } = await supabase.from('email_templates').update({ subject, body, updated_at: new Date().toISOString() }).eq('key', selKey);
    setSaving(false);
    if (error) setToast({ type: 'err', msg: error.message });
    else { setToast({ type: 'ok', msg: 'Template saved.' }); setTemplates(ts => ts.map(t => t.key === selKey ? { ...t, subject, body } : t)); }
    setTimeout(() => setToast(null), 3000);
  }

  function fillPreview(text: string): string {
    let r = text;
    for (const [k, v] of Object.entries(SAMPLE_DATA)) r = r.split(`{{${k}}}`).join(v);
    return r;
  }

  if (!isAdminOrOwner) return <div className="text-white/50">Admin access required to manage email templates.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Email Templates</h1>
        <p className="text-white/50">Edit the templates used for application notifications. Use placeholders like {'{{applicant_name}}'}, {'{{application_id}}'}, {'{{job_title}}'}.</p>
      </div>

      {toast && <div className={`rounded-lg border p-3 text-sm ${toast.type === 'ok' ? 'border-acid-400/30 bg-acid-400/10 text-acid-300' : 'border-synf-500/30 bg-synf-500/10 text-synf-300'}`}>{toast.msg}</div>}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Template list */}
        <div className="space-y-1">
          {ALL_KEYS.map(key => {
            const t = templates.find(t => t.key === key);
            return (
              <button key={key} onClick={() => selectTemplate(key)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${selKey === key ? 'bg-synf-500/15 text-synf-300' : 'text-white/60 hover:bg-white/5'}`}>
                {TEMPLATE_LABELS[key] || key}
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewMode(false)} className={`btn-ghost ${!previewMode ? 'bg-white/10' : ''}`}>Edit</button>
            <button onClick={() => setPreviewMode(true)} className={`btn-ghost ${previewMode ? 'bg-white/10' : ''}`}><Eye size={14} /> Preview</button>
          </div>

          {!previewMode ? (
            <>
              <div><label className="label">Subject</label><input className="input" value={subject} onChange={e => setSubject(e.target.value)} /></div>
              <div><label className="label">Body</label><textarea className="input min-h-[300px] font-mono text-xs" value={body} onChange={e => setBody(e.target.value)} /></div>
              <div className="flex gap-3">
                <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Saving…' : 'Save template'}</button>
              </div>
            </>
          ) : (
            <div className="card p-5">
              <div className="text-xs uppercase tracking-widest text-ink-500">Subject</div>
              <div className="mt-1 font-semibold text-white">{fillPreview(subject)}</div>
              <div className="mt-4 text-xs uppercase tracking-widest text-ink-500">Body</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-white/80">{fillPreview(body)}</div>
            </div>
          )}

          {/* Test email */}
          <div className="card space-y-3 p-5">
            <h3 className="font-display text-sm font-bold">Send Test Email</h3>
            <p className="text-xs text-ink-500">Sends the current template with sample data to the email below. Marked as test — does not affect application statuses.</p>
            <div className="flex gap-2">
              <input className="input flex-1" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" />
              <button onClick={async () => {
                if (!testEmail) return;
                const { data: session } = await supabase.auth.getSession();
                const res = await fetch(`${SUPABASE_URL}/functions/v1/application-action`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.session?.access_token}`, 'apikey': session.session?.access_token || '' },
                  body: JSON.stringify({ action: 'test_email', template_key: selKey, to: testEmail }),
                });
                const d = await res.json();
                if (d.error) setToast({ type: 'err', msg: d.error });
                else setToast({ type: 'ok', msg: 'Test email sent.' });
                setTimeout(() => setToast(null), 3000);
              }} className="btn-ghost"><Send size={14} /> Send test</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
