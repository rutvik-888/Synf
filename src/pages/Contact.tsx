import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Instagram, Send, Check, AlertCircle, ArrowRight, Sparkles, Calendar, Handshake, Newspaper, Briefcase, Lightbulb, MessageSquare, ChevronDown, Loader2 } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { submitPublicForm } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { EnquiryCategoryRow, SiteContentRow } from '@/lib/types';

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
  const [categories, setCategories] = useState<EnquiryCategoryRow[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', organization: '', category_id: '', category: '',
    subject: '', message: '', links: '', preferred_contact_method: 'email', company_website: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [err, setErr] = useState('');
  const [refNum, setRefNum] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

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

  const heroHeading = (settings?.hero_heading as string) || "Let's Start a Conversation.";
  const heroSubheading = (settings?.hero_subheading as string) || 'Questions, press, partnerships, feedback — whatever it is, we\'re listening. Reach out and let\'s see where it goes.';
  const publicEmail = (settings?.public_email as string) || 'synf.c@com.gh';
  const showPublicEmail = settings?.show_public_email !== false;
  const showPhoneField = settings?.show_phone_field !== false;
  const showOrgField = settings?.show_organization_field !== false;
  const showLinksField = settings?.show_links_field !== false;
  const showPreferredContact = settings?.show_preferred_contact !== false;
  const successMsg = (settings?.success_message as string) || 'Your message has been received. Our team will review it and reach out if a response is needed.';

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = 'Your name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email';
    if (!form.category_id) e.category_id = 'Please select a category';
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.message.trim()) e.message = 'Message is required';
    else if (form.message.trim().length < 10) e.message = 'Message is too short (min 10 characters)';
    if (form.phone && !/^[+]?[\d\s()-]{6,20}$/.test(form.phone)) e.phone = 'Invalid phone format';
    if (form.links && !/^https?:\/\/.+/i.test(form.links)) e.links = 'Must start with http:// or https://';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectCategory(catId: string) {
    const cat = categories.find(c => c.id === catId);
    if (cat) { set('category_id', cat.id); set('category', cat.display_name); }
    scrollToForm();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;
    if (!validate()) return;
    setStatus('loading'); setErr('');
    const r = await submitPublicForm({
      kind: 'enquiry',
      full_name: form.full_name, email: form.email, phone: form.phone || undefined,
      organization: form.organization || undefined, category_id: form.category_id, category: form.category,
      subject: form.subject, message: form.message, links: form.links || undefined,
      preferred_contact_method: form.preferred_contact_method,
      consent_text: 'I agree to be contacted regarding my enquiry. My data will be stored and used per the Privacy Policy.',
      company_website: form.company_website,
    });
    if (r.error) { setStatus('err'); setErr(r.error); }
    else {
      setStatus('ok');
      setRefNum(r.reference_number || '');
      setForm({ full_name: '', email: '', phone: '', organization: '', category_id: '', category: '', subject: '', message: '', links: '', preferred_contact_method: 'email', company_website: '' });
    }
  }

  // Contact cards configuration
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
            {status === 'idle' && <div className="mb-5 flex items-center justify-between"><div><div className="section-eyebrow mb-1"><Send size={14} /> Your message</div><p className="text-sm text-white/50">We read every note. Make it a good one.</p></div><span className="font-mono text-xs text-white/30">01—04</span></div>}
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
            ) : (
              <form onSubmit={submit} className="card relative space-y-4 overflow-hidden p-6 backdrop-blur-sm sm:p-8" noValidate>
                <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-acid-400/10 blur-3xl" />
                {/* Honeypot */}
                <div className="hidden" aria-hidden="true"><label>Company<input value={form.company_website} onChange={e => set('company_website', e.target.value)} tabIndex={-1} autoComplete="off" /></label></div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Full name *</label>
                    <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} aria-invalid={!!errors.full_name} />
                    {errors.full_name && <p className="mt-1 text-xs text-synf-400">{errors.full_name}</p>}
                  </div>
                  <div>
                    <label className="label">Email address *</label>
                    <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} aria-invalid={!!errors.email} />
                    {errors.email && <p className="mt-1 text-xs text-synf-400">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Enquiry category *</label>
                    <select className="input" value={form.category_id} onChange={e => { const cat = categories.find(c => c.id === e.target.value); setForm(f => ({ ...f, category_id: e.target.value, category: cat?.display_name || '' })); setErrors(er => ({ ...er, category_id: '' })); }} aria-invalid={!!errors.category_id}>
                      <option value="">Select a category…</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                    </select>
                    {errors.category_id && <p className="mt-1 text-xs text-synf-400">{errors.category_id}</p>}
                  </div>
                  <div>
                    <label className="label">Subject *</label>
                    <input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Brief summary" aria-invalid={!!errors.subject} />
                    {errors.subject && <p className="mt-1 text-xs text-synf-400">{errors.subject}</p>}
                  </div>
                </div>

                <div>
                  <label className="label">Message *</label>
                  <textarea className="input min-h-[140px]" value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell us what's on your mind…" aria-invalid={!!errors.message} />
                  {errors.message && <p className="mt-1 text-xs text-synf-400">{errors.message}</p>}
                </div>

                {(showPhoneField || showOrgField) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {showPhoneField && (
                      <div>
                        <label className="label">Phone <span className="text-ink-500">(optional)</span></label>
                        <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91…" aria-invalid={!!errors.phone} />
                        {errors.phone && <p className="mt-1 text-xs text-synf-400">{errors.phone}</p>}
                      </div>
                    )}
                    {showOrgField && (
                      <div>
                        <label className="label">Organization / Brand / College <span className="text-ink-500">(optional)</span></label>
                        <input className="input" value={form.organization} onChange={e => set('organization', e.target.value)} placeholder="If applicable" />
                      </div>
                    )}
                  </div>
                )}

                {(showLinksField || showPreferredContact) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {showLinksField && (
                      <div>
                        <label className="label">Website / Portfolio / Social <span className="text-ink-500">(optional)</span></label>
                        <input className="input" value={form.links} onChange={e => set('links', e.target.value)} placeholder="https://…" aria-invalid={!!errors.links} />
                        {errors.links && <p className="mt-1 text-xs text-synf-400">{errors.links}</p>}
                      </div>
                    )}
                    {showPreferredContact && (
                      <div>
                        <label className="label">Preferred contact method</label>
                        <select className="input" value={form.preferred_contact_method} onChange={e => set('preferred_contact_method', e.target.value)}>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-white/50">
                  By submitting, you agree to be contacted regarding your enquiry. Your data is stored and used per our{' '}
                  <Link to="/privacy" className="text-synf-400 underline">Privacy Policy</Link>.
                </p>

                {status === 'err' && <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> {err}</div>}

                <button type="submit" disabled={status === 'loading'} className="btn-primary w-full group">
                  {status === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Send size={16} /> Send enquiry <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
