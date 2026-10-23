import { useState, useEffect } from 'react';
import { Sparkles, Send, Check, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { DynamicFormFields, validateFormFields, useFormFields } from '@/components/DynamicFormFields';
import { submitPublicForm } from '@/lib/api';
import { useFormDefinition } from '@/lib/useFormDefinition';
import { useSeo } from '@/lib/seo';

const DRAFT_KEY = 'synf_collab_draft';

export function Collaborate() {
  const { formDef, loading: formLoading } = useFormDefinition('collaboration');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [err, setErr] = useState('');
  const [refNum, setRefNum] = useState('');
  const [showDraftRestored, setShowDraftRestored] = useState(false);
  const [values, setFieldValue, resetValues] = useFormFields(formDef?.fields || []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading' || !formDef) return;

    const fieldErrors = validateFormFields(formDef.fields, values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setStatus('loading'); setErr('');

    const payload: Record<string, unknown> = {
      kind: 'enquiry',
      form_key: 'collaboration',
      form_fields: formDef.fields,
      consent_text: formDef.consent_text,
      company_website: '',
    };
    for (const field of formDef.fields) {
      payload[field.id] = values[field.id] || '';
      if (field.id === 'f_name') payload.full_name = values[field.id] || '';
      if (field.id === 'f_email') payload.email = values[field.id] || '';
      if (field.id === 'f_phone') payload.phone = values[field.id] || '';
      if (field.id === 'f_brand') payload.brand = values[field.id] || '';
      if (field.id === 'f_category') payload.category = values[field.id] || '';
      if (field.id === 'f_event') payload.event_name = values[field.id] || '';
      if (field.id === 'f_date') payload.preferred_date = values[field.id] || null;
      if (field.id === 'f_city') payload.venue_city = values[field.id] || '';
      if (field.id === 'f_budget') payload.budget_range = values[field.id] || '';
      if (field.id === 'f_audience') payload.audience_size = values[field.id] || '';
      if (field.id === 'f_message') payload.message = values[field.id] || '';
      if (field.id === 'f_links') payload.links = values[field.id] || '';
    }

    const r = await submitPublicForm(payload);
    if (r.error) { setStatus('err'); setErr(r.error); }
    else {
      setStatus('ok');
      setRefNum(r.reference_number || '');
      resetValues();
      localStorage.removeItem(DRAFT_KEY);
    }
  }

  // Auto-save draft to localStorage on field changes
  useEffect(() => {
    if (status === 'ok' || !formDef) return;
    const hasContent = Object.values(values).some(v => v && String(v).trim());
    if (hasContent) localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  }, [values, formDef, status]);

  // Restore draft on mount
  useEffect(() => {
    if (!formDef || formLoading) return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([k, v]) => setFieldValue(k, v as string));
        setShowDraftRestored(true);
      } catch { /* ignore */ }
    }
  }, [formDef, formLoading]);

  useSeo({
    title: 'Collaborate with Team Synf — Brands, Venues, DJs & Creatives',
    description: 'Partner with Team Synf. Brands, venues, DJs, artists, photographers and creatives — if you\'ve got an idea that fits our energy, we want to hear it. Based in Hyderabad, India.',
    path: '/collaborate',
    keywords: ['collaborate Team Synf', 'event sponsorship Hyderabad', 'brand partnership India', 'DJ collaboration Hyderabad', 'venue partnership Hyderabad', 'event creative collaboration', 'Hyderabad nightlife partnership'],
  });

  return (
    <div className="bg-ink-950">
      {/* Header */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-synf-600/18 to-transparent" />
          <div className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-tl from-ember-500/12 to-transparent" />
        </div>
        <div className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-synf-500/12 blur-[120px] animate-float" />
        <div className="absolute -right-40 bottom-0 h-[25rem] w-[25rem] rounded-full bg-ember-500/10 blur-[100px] animate-float" style={{ animationDelay: '5s' }} />
        <div className="grain pointer-events-none absolute inset-0 opacity-10" />
        <div className="container-synf relative">
          <Reveal className="section-eyebrow"><Sparkles size={14} /> Collaborate</Reveal>
          <Reveal><h1 className="display-xl text-balance text-[clamp(2.5rem,10vw,8rem)]">Let's build a night<br /><span className="text-gradient-vibe">to remember.</span></h1></Reveal>
          <Reveal delay={150}><p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">Brands, venues, DJs, artists, photographers, promoters and creatives — if you've got an idea that fits our energy, we want to hear it. Direct, no corporate fluff.</p></Reveal>
          <Reveal delay={250} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-widest text-white/40"><span className="text-synf-400">Open brief</span><span className="text-white/20">/</span><span>Hyderabad · India</span><span className="text-white/20">/</span><span>2026</span></Reveal>
        </div>
      </section>

      <section className="container-synf pb-24">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Cards */}
          <div className="lg:col-span-1 space-y-4">
            <div className="mb-7"><div className="section-eyebrow"><Sparkles size={14} /> Ways in</div><p className="text-sm leading-relaxed text-white/50">Bring the spark. We'll bring the room, the people, and the energy.</p></div>
            {[
              { t: 'Brands & sponsors', d: 'Activate with a student audience through memorable nights.' },
              { t: 'Venues', d: 'Host our next event or partner on a residency.' },
              { t: 'DJs & artists', d: 'Join a lineup or pitch a concept for a night.' },
              { t: 'Creatives', d: 'Photographers, videographers, designers — collab on captures and identity.' },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="group card-hover p-5">
                  <h3 className="font-display text-lg font-extrabold text-synf-400">{c.t}</h3>
                  <p className="mt-1 text-sm text-white/60">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {status === 'ok' ? (
              <div className="card flex flex-col items-center justify-center p-12 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-acid-400/15 text-acid-400 animate-scale-in"><Check size={32} /></div>
                <h2 className="mt-6 font-display text-3xl font-extrabold">Enquiry received</h2>
                {refNum && <div className="mt-4 rounded-lg border border-synf-500/30 bg-synf-500/10 px-4 py-2 font-mono text-lg font-bold text-synf-300">{refNum}</div>}
                <p className="mt-4 max-w-md text-white/60">{formDef?.success_message || 'Thanks for reaching out. Our team will get back to you at the email you provided.'}</p>
                {refNum && <p className="mt-2 max-w-md text-sm text-ink-500">Please retain your reference number for future correspondence.</p>}
                <button onClick={() => { setStatus('idle'); setRefNum(''); }} className="btn-ghost mt-6">Send another</button>
              </div>
            ) : formLoading ? (
              <div className="card flex items-center justify-center p-12"><Loader2 size={24} className="animate-spin text-synf-400" /></div>
            ) : formDef ? (
              <form onSubmit={submit} className="card relative space-y-4 overflow-hidden p-6 backdrop-blur-sm sm:p-8">
                <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-synf-500/10 blur-3xl" />
                <div className="relative mb-6 border-b border-white/10 pb-5"><div className="font-mono text-[10px] uppercase tracking-[0.25em] text-synf-400">Collaboration brief</div><h2 className="mt-2 font-display text-2xl font-extrabold">{formDef.title || "Tell us what you're imagining."}</h2><p className="mt-1 text-sm text-white/50">{formDef.intro || 'The more context, the better we can make it real.'}</p></div>
                {showDraftRestored && <div className="flex items-center justify-between rounded-lg border border-gold-400/20 bg-gold-400/5 px-3 py-2 text-xs text-gold-400"><span>Restored your unsaved draft from a previous visit.</span><button onClick={() => { localStorage.removeItem(DRAFT_KEY); resetValues(); setShowDraftRestored(false); }} className="underline hover:no-underline">Clear</button></div>}
                {/* Honeypot */}
                <div className="hidden"><label>Company<input value={(values as Record<string, string>).company_website || ''} onChange={e => setFieldValue('company_website', e.target.value)} tabIndex={-1} autoComplete="off" /></label></div>

                <DynamicFormFields
                  fields={formDef.fields}
                  values={values}
                  errors={errors}
                  onChange={setFieldValue}
                />

                <p className="text-xs text-white/50">
                  By submitting, you agree to be contacted about this enquiry. Your data will be stored and used per the{' '}
                  <a href="/privacy" className="text-synf-400 underline">Privacy Policy</a>.
                </p>

                {status === 'err' && <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> {err}</div>}
                <button type="submit" disabled={status === 'loading'} className="btn-primary w-full group">
                  {status === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <>Send enquiry <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
                </button>
              </form>
            ) : (
              <div className="card p-8 text-center text-white/50">Collaboration form is being configured. Please check back soon.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
