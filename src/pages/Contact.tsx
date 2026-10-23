import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Instagram, Send, Check, AlertCircle, ArrowRight, Sparkles, Calendar, Handshake, Newspaper, Briefcase, Lightbulb, MessageSquare, ChevronDown, Loader2 } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { DynamicFormFields, validateFormFields, useFormFields } from '@/components/DynamicFormFields';
import { submitPublicForm } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useFormDefinition } from '@/lib/useFormDefinition';
import type { EnquiryCategoryRow, SiteContentRow } from '@/lib/types';
import { useSeo, organizationJsonLd } from '@/lib/seo';

const DRAFT_KEY = 'synf_contact_draft';

const CATEGORY_ICONS: Record<string, typeof Mail> = {
  MessageSquare: MessageSquare,
  Calendar: Calendar,
  Handshake: Handshake,
  Newspaper: Newspaper,
  Briefcase: Briefcase,
  Lightbulb: Lightbulb,
  Mail: Mail,
};

export function Contact() {
  const { formDef, loading: formLoading } = useFormDefinition('contact');
  const [categories, setCategories] = useState<EnquiryCategoryRow[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [err, setErr] = useState('');
  const [refNum, setRefNum] = useState('');
  const [showDraftRestored, setShowDraftRestored] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [values, setFieldValue, resetValues] = useFormFields(formDef?.fields || []);

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: sc }] = await Promise.all([
        supabase.from('enquiry_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('site_content').select('data').eq('slug', 'contact_settings').maybeSingle(),
      ]);
      setCategories((cats as EnquiryCategoryRow[]) || []);
      if (sc) setSettings((sc as SiteContentRow).data as Record<string, unknown>);
    })();
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (status === 'ok' || !formDef) return;
    const hasContent = Object.values(values).some(v => v && String(v).trim());
    if (hasContent) localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  }, [values, formDef, status]);

  // Restore draft
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

  const heroHeading = (settings?.hero_heading as string) || "Let's Start a Conversation.";
  const heroSubheading = (settings?.hero_subheading as string) || 'Questions, press, partnerships, feedback — whatever it is, we\'re listening. Reach out and let\'s see where it goes.';
  const publicEmail = (settings?.public_email as string) || 'synf.c@com.gh';
  const showPublicEmail = settings?.show_public_email !== false;
  const successMsg = formDef?.success_message || (settings?.success_message as string) || 'Your message has been received. Our team will review it and reach out if a response is needed.';

  useSeo({
    title: 'Contact Team Synf — Enquiries, Press & Partnerships',
    description: 'Get in touch with Team Synf. General enquiries, event questions, brand partnerships, media & press, careers and feedback. We read every message.',
    path: '/contact',
    keywords: ['contact Team Synf', 'Team Synf email', 'Hyderabad event contact', 'brand partnership Hyderabad', 'event sponsorship India', 'press contact Team Synf', 'event enquiry Hyderabad'],
    jsonLd: organizationJsonLd(),
  });

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectCategory(catId: string) {
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      const categoryField = formDef?.fields.find(f => f.id === 'f_category');
      if (categoryField) setFieldValue('f_category', cat.display_name);
    }
    scrollToForm();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;
    if (!formDef) return;

    const fieldErrors = validateFormFields(formDef.fields, values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setStatus('loading'); setErr('');

    const payload: Record<string, unknown> = {
      kind: 'enquiry',
      form_key: 'contact',
      form_fields: formDef.fields,
      consent_text: formDef.consent_text,
      company_website: '',
    };
    for (const field of formDef.fields) {
      payload[field.id] = values[field.id] || '';
      if (field.id === 'f_name') payload.full_name = values[field.id] || '';
      if (field.id === 'f_email') payload.email = values[field.id] || '';
      if (field.id === 'f_phone') payload.phone = values[field.id] || '';
      if (field.id === 'f_org') payload.organization = values[field.id] || '';
      if (field.id === 'f_subject') payload.subject = values[field.id] || '';
      if (field.id === 'f_message') payload.message = values[field.id] || '';
      if (field.id === 'f_links') payload.links = values[field.id] || '';
      if (field.id === 'f_category') payload.category = values[field.id] || '';
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

  const contactCards = [
    { catSlug: 'general', icon: MessageSquare, title: 'General Enquiries', desc: 'Questions, information, or just want to say hi.', action: 'form' },
    { catSlug: 'event', icon: Calendar, title: 'Events & Experiences', desc: 'Ticketing, event details, or hosting enquiries.', action: 'form' },
    { catSlug: 'brand', icon: Handshake, title: 'Brand Partnerships', desc: 'Sponsorships and brand collaborations.', action: 'collaborate' },
    { catSlug: 'media', icon: Newspaper, title: 'Media & Press', desc: 'Press requests, interviews, and media kits.', action: 'form' },
    { catSlug: 'careers', icon: Briefcase, title: 'Careers & Recruitment', desc: 'Join the team or explore open roles.', action: 'jobs' },
    { catSlug: 'feedback', icon: Lightbulb, title: 'Feedback & Suggestions', desc: 'Ideas, feedback, or suggestions for improvement.', action: 'form' },
  ];

  return (
    <div className="bg-ink-950">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-electric-500/18 to-transparent" />
          <div className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-tl from-violet-500/15 to-transparent" />
        </div>
        <div className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-electric-500/12 blur-[120px] animate-float" />
        <div className="absolute -right-40 bottom-0 h-[25rem] w-[25rem] rounded-full bg-violet-500/12 blur-[100px] animate-float" style={{ animationDelay: '5s' }} />
        <div className="grain pointer-events-none absolute inset-0 opacity-10" />
        <div className="container-synf relative">
          <Reveal className="section-eyebrow"><Mail size={14} /> Contact</Reveal>
          <Reveal><h1 className="display-xl text-balance text-[clamp(2.5rem,10vw,8rem)] leading-[0.9]">{heroHeading.split(' ').slice(0, -1).join(' ')} <span className="text-gradient-vibe">{heroHeading.split(' ').slice(-1)[0]}</span></h1></Reveal>
          <Reveal delay={150}><p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">{heroSubheading}</p></Reveal>
          <Reveal delay={250} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-widest text-white/40"><span className="text-synf-400">Inbox open</span><span className="text-white/20">/</span><span>Press · partnerships · ideas</span></Reveal>
          <Reveal delay={300}>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={scrollToForm} className="btn-primary btn-lg group"><Send size={16} /> Send an Enquiry <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></button>
              <Link to="/collaborate" className="btn-ghost btn-lg"><Sparkles size={16} /> Explore Collaborations</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Contact cards */}
      <section className="container-synf pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contactCards.map((card, i) => {
            const Icon = card.icon;
            const cat = categories.find(c => c.slug === card.catSlug);
            const handleClick = () => {
              if (card.action === 'collaborate') window.location.href = '/collaborate';
              else if (card.action === 'jobs') window.location.href = '/jobs';
              else if (cat) selectCategory(cat.id);
              else scrollToForm();
            };
            return (
              <Reveal key={i} delay={i * 60} direction="scale">
                <button onClick={handleClick} className="group card-hover w-full p-5 text-left">
                  <div className="flex items-start gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-synf-500/15 text-synf-400 transition-colors group-hover:bg-synf-500/25">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-white">{card.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-white/60">{card.desc}</p>
                    </div>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Main form + sidebar */}
      <section ref={formRef} className="container-synf pb-24">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="space-y-4">
            {showPublicEmail && (
              <div className="card flex items-center gap-4 p-5">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-synf-500/15 text-synf-400">
                  <Mail size={20} />
                </div>
                <div><div className="text-sm text-ink-500">Email</div><a href={`mailto:${publicEmail}`} className="font-semibold text-white transition-colors hover:text-synf-400">{publicEmail}</a></div>
              </div>
            )}
            <a href="https://www.instagram.com/team.synf/" target="_blank" rel="noopener noreferrer" className="group card flex items-center gap-4 p-5 transition-all hover:border-synf-500/40 hover:shadow-[0_0_40px_-15px] hover:shadow-synf-500/30">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-synf-500/15 text-synf-400 transition-colors group-hover:bg-synf-500/25">
                <Instagram size={20} />
              </div>
              <div><div className="text-sm text-ink-500">Instagram</div><div className="font-semibold">@team.synf</div></div>
            </a>
            <div className="card p-5 text-sm text-white/60">
              <p className="font-semibold text-white">Quick links</p>
              <ul className="mt-3 space-y-2">
                <li><Link to="/events" className="transition-colors hover:text-synf-400">Events</Link></li>
                <li><Link to="/people" className="transition-colors hover:text-synf-400">The Collective</Link></li>
                <li><Link to="/jobs" className="transition-colors hover:text-synf-400">Join</Link></li>
                <li><Link to="/collaborate" className="transition-colors hover:text-synf-400">Collaborate</Link></li>
                <li><Link to="/privacy" className="transition-colors hover:text-synf-400">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Form / Success */}
          <div className="lg:col-span-2">
            {status === 'idle' && !formLoading && formDef && <div className="mb-5 flex items-center justify-between"><div><div className="section-eyebrow mb-1"><Send size={14} /> Your message</div><p className="text-sm text-white/50">{formDef.intro || 'We read every note. Make it a good one.'}</p></div><span className="font-mono text-xs text-white/30">{formDef.fields.length} fields</span></div>}
            {status === 'ok' ? (
              <div className="card flex flex-col items-center justify-center p-8 text-center sm:p-12">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-acid-400/15 text-acid-400 animate-scale-in"><Check size={32} /></div>
                <h2 className="mt-6 font-display text-3xl font-extrabold">Your message has been received.</h2>
                {refNum && <div className="mt-4 rounded-lg border border-synf-500/30 bg-synf-500/10 px-4 py-2 font-mono text-lg font-bold text-synf-300">{refNum}</div>}
                <p className="mt-4 max-w-md text-white/60">{successMsg}</p>
                <p className="mt-2 max-w-md text-sm text-ink-500">Please retain your reference number for future correspondence.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link to="/" className="btn-primary group">Return Home <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
                  <Link to="/events" className="btn-ghost">View Events</Link>
                  <button onClick={() => { setStatus('idle'); setRefNum(''); }} className="btn-ghost">Send another</button>
                </div>
              </div>
            ) : formLoading ? (
              <div className="card flex items-center justify-center p-12"><Loader2 size={24} className="animate-spin text-synf-400" /></div>
            ) : formDef ? (
              <form onSubmit={submit} className="card relative space-y-4 overflow-hidden p-6 backdrop-blur-sm sm:p-8" noValidate>
                <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-acid-400/10 blur-3xl" />
                {showDraftRestored && <div className="flex items-center justify-between rounded-lg border border-gold-400/20 bg-gold-400/5 px-3 py-2 text-xs text-gold-400"><span>Restored your unsaved draft from a previous visit.</span><button type="button" onClick={() => { localStorage.removeItem(DRAFT_KEY); resetValues(); setShowDraftRestored(false); }} className="underline hover:no-underline">Clear</button></div>}
                {/* Honeypot */}
                <div className="hidden" aria-hidden="true"><label>Company<input value={(values as Record<string, string>).company_website || ''} onChange={e => setFieldValue('company_website', e.target.value)} tabIndex={-1} autoComplete="off" /></label></div>

                <DynamicFormFields
                  fields={formDef.fields}
                  values={values}
                  errors={errors}
                  onChange={setFieldValue}
                />

                <p className="text-xs text-white/50">
                  By submitting, you agree to be contacted regarding your enquiry. Your data is stored and used per our{' '}
                  <Link to="/privacy" className="text-synf-400 underline">Privacy Policy</Link>.
                </p>

                {status === 'err' && <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> {err}</div>}

                <button type="submit" disabled={status === 'loading'} className="btn-primary w-full group">
                  {status === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Send size={16} /> Send enquiry <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
                </button>
              </form>
            ) : (
              <div className="card p-8 text-center text-white/50">Contact form is being configured. Please check back soon.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
