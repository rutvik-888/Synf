import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Check, AlertCircle, Sparkles, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { JobPostingRow, FormField } from '@/lib/types';
import { submitApplication } from '@/lib/api';
import { Reveal } from '@/components/Reveal';

export function JobApply() {
  const { slug } = useParams();
  const [job, setJob] = useState<JobPostingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [err, setErr] = useState('');
  const [appId, setAppId] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from('job_postings').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
      if (data) {
        const j = data as JobPostingRow;
        const today = new Date().toISOString().split('T')[0];
        if (j.application_close && j.application_close < today) setClosed(true);
        setJob(j);
      }
      setLoading(false);
    })();
  }, [slug]);

  const fields: FormField[] = job?.form_fields || [];

  function setAnswer(id: string, val: unknown) { setAnswers(a => ({ ...a, [id]: val })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!job || !consent) { setStatus('err'); setErr('Please accept the privacy consent to continue.'); return; }

    // Validate required fields
    for (const f of fields) {
      if (f.required) {
        const v = answers[f.id];
        if (!v || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)) {
          setStatus('err'); setErr(`"${f.label}" is required.`); return;
        }
      }
    }

    setStatus('loading'); setErr('');

    // Extract standard fields from answers
    const fullName = String(answers['full_name'] || '').trim();
    const email = String(answers['email'] || '').trim();
    if (!fullName || !email) { setStatus('err'); setErr('Name and email are required.'); return; }

    const phone = answers['phone'] ? String(answers['phone']) : undefined;
    const instagram = answers['instagram'] ? String(answers['instagram']) : undefined;
    const city = answers['city'] ? String(answers['city']) : undefined;

    const r = await submitApplication({
      job_id: job.id,
      full_name: fullName,
      email,
      phone,
      instagram,
      city,
      answers,
      consent_text: 'I agree to the processing of my application data per the Team Synf Privacy Policy.',
    });

    if (r.error) { setStatus('err'); setErr(r.error); }
    else { setStatus('ok'); setAppId(r.application_id || ''); setEmailSent(r.email_sent || false); }
  }

  function renderField(f: FormField) {
    const v = answers[f.id] as string;
    const set = (val: unknown) => setAnswer(f.id, val);
    const common = { id: f.id, required: f.required, placeholder: f.placeholder };
    switch (f.type) {
      case 'long_text': return <textarea className="input min-h-[100px]" {...common} value={v || ''} onChange={e => set(e.target.value)} />;
      case 'email': return <input className="input" type="email" {...common} value={v || ''} onChange={e => set(e.target.value)} />;
      case 'phone': return <input className="input" type="tel" {...common} value={v || ''} onChange={e => set(e.target.value)} />;
      case 'url': return <input className="input" type="url" {...common} value={v || ''} onChange={e => set(e.target.value)} />;
      case 'date': return <input className="input" type="date" {...common} value={v || ''} onChange={e => set(e.target.value)} />;
      case 'dropdown': return <select className="input" value={v || ''} onChange={e => set(e.target.value)}><option value="">Select…</option>{(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select>;
      case 'radio': return <div className="flex flex-wrap gap-2">{(f.options || []).map(o => <label key={o} className={`chip cursor-pointer border ${v === o ? 'border-synf-500 bg-synf-500/20 text-synf-300' : 'border-white/10 text-white/70'}`}><input type="radio" name={f.id} className="sr-only" checked={v === o} onChange={() => set(o)} />{o}</label>)}</div>;
      case 'multi_select': {
        const arr = (answers[f.id] || []) as string[];
        return (
          <div className="flex flex-wrap gap-2">
            {(f.options || []).map(o => {
              const on = arr.includes(o);
              return (
                <label key={o} className={`chip cursor-pointer border ${on ? 'border-synf-500 bg-synf-500/20 text-synf-300' : 'border-white/10 text-white/70'}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => set(on ? arr.filter(x => x !== o) : [...arr, o])} />
                  {o}
                </label>
              );
            })}
          </div>
        );
      }
      case 'checkbox': return <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" className="accent-synf-500" checked={!!v} onChange={e => set(e.target.checked)} /> {f.help || 'Yes'}</label>;
      case 'file': return <div className="rounded-lg border border-dashed border-ink-600 p-4 text-center text-xs text-ink-500"><FileText size={20} className="mx-auto mb-2" /> File uploads — add a link to your work in a URL field instead for now.</div>;
      default: return <input className="input" {...common} value={v || ''} onChange={e => set(e.target.value)} />;
    }
  }

  if (loading) return <div className="container-synf py-24"><div className="h-64 animate-pulse rounded-2xl bg-ink-900" /></div>;
  if (!job) return (
    <div className="container-synf py-24 text-center">
      <h1 className="font-display text-2xl font-extrabold">Job not found</h1>
      <Link to="/jobs" className="btn-primary mt-6">View all open roles</Link>
    </div>
  );

  if (closed) return (
    <div className="container-synf py-24 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-synf-400" />
      <h1 className="mt-4 font-display text-2xl font-extrabold">Applications closed</h1>
      <p className="mt-2 text-white/60">The deadline for {job.title} has passed.</p>
      <Link to="/jobs" className="btn-primary mt-6">View other open roles</Link>
    </div>
  );

  if (status === 'ok') return (
    <div className="bg-ink-950">
      <section className="container-synf py-24">
        <div className="card mx-auto max-w-2xl p-12 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-acid-400/15 text-acid-400 animate-scale-in"><Check size={32} /></div>
          <h1 className="mt-6 font-display text-3xl font-extrabold">Application submitted!</h1>
          <p className="mt-3 text-lg text-white/70">Your application ID is</p>
          <div className="mt-2 font-mono text-2xl font-extrabold text-synf-400">{appId}</div>
          <p className="mt-4 max-w-md mx-auto text-sm text-white/60">
            We've sent a confirmation email with your application details.
            Please keep this ID for future communication with Team Synf.
          </p>
          {!emailSent && <p className="mt-3 rounded-lg border border-gold-400/20 bg-gold-400/5 p-3 text-xs text-gold-400">Your application was saved, but the confirmation email could not be sent right now. Don't worry — your application is still valid. Save your application ID above.</p>}
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/jobs" className="btn-ghost">Back to open roles</Link>
            <Link to="/" className="btn-primary">Go home</Link>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="bg-ink-950">
      <section className="container-synf py-16">
        <Link to={`/jobs/${job.slug}`} className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={16} /> Back to {job.title}</Link>
        <Reveal className="section-eyebrow"><Sparkles size={14} /> Apply</Reveal>
        <Reveal><h1 className="display-xl text-[clamp(2rem,7vw,5rem)]">Apply: <span className="text-gradient-synf">{job.title}</span></h1></Reveal>
        <Reveal delay={150}><p className="mt-4 max-w-2xl text-lg text-white/70">{job.department} · {job.description?.slice(0, 120)}{job.description && job.description.length > 120 ? '…' : ''}</p></Reveal>
      </section>

      <section className="container-synf pb-24">
        <form onSubmit={submit} className="card mx-auto max-w-2xl space-y-4 p-6 sm:p-8">
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.id}>
                <label className="label" htmlFor={f.id}>{f.label}{f.required && ' *'}</label>
                {renderField(f)}
                {f.help && f.type !== 'checkbox' && <p className="mt-1 text-xs text-ink-500">{f.help}</p>}
              </div>
            ))}
          </div>
          <label className="flex items-start gap-2 text-xs text-white/60">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-synf-500" />
            I agree to the processing of my application data per the Team Synf <Link to="/privacy" className="text-synf-400 underline">Privacy Policy</Link>. My information will be used solely for recruitment purposes.
          </label>
          {status === 'err' && <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> {err}</div>}
          <button type="submit" disabled={status === 'loading'} className="btn-primary w-full group"><Send size={16} /> {status === 'loading' ? 'Submitting…' : 'Submit application'}</button>
        </form>
      </section>
    </div>
  );
}
