import { useState } from 'react';
import { Sparkles, Send, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { submitPublicForm } from '@/lib/api';

const CATEGORIES = ['Brand / Sponsor', 'Venue / Hospitality', 'DJ / Artist', 'Promoter', 'Photographer / Videographer', 'Creative Partner', 'Production / Logistics', 'Other'];

export function Collaborate() {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', brand: '', category: '', event_name: '',
    preferred_date: '', venue_city: '', budget_range: '', audience_size: '', message: '', links: '', company_website: '',
  });
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [err, setErr] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.message || !consent) {
      setStatus('err'); setErr('Please fill required fields and accept the consent checkbox.'); return;
    }
    setStatus('loading'); setErr('');
    const consentText = 'I agree to be contacted about this collaboration enquiry. My data will be stored and used per the Privacy Policy.';
    const r = await submitPublicForm({ kind: 'enquiry', ...form, preferred_date: form.preferred_date || null, consent_text: consentText });
    if (r.error) { setStatus('err'); setErr(r.error); }
    else { setStatus('ok'); setForm({ full_name: '', email: '', phone: '', brand: '', category: '', event_name: '', preferred_date: '', venue_city: '', budget_range: '', audience_size: '', message: '', links: '', company_website: '' }); }
  }

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
            <div className="mb-7"><div className="section-eyebrow"><Sparkles size={14} /> Ways in</div><p className="text-sm leading-relaxed text-white/50">Bring the spark. We’ll bring the room, the people, and the energy.</p></div>
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
                <p className="mt-2 max-w-md text-white/60">Thanks for reaching out. Our team will get back to you at the email you provided.</p>
                <button onClick={() => setStatus('idle')} className="btn-ghost mt-6">Send another</button>
              </div>
            ) : (
              <form onSubmit={submit} className="card relative space-y-4 overflow-hidden p-6 backdrop-blur-sm sm:p-8">
                <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-synf-500/10 blur-3xl" />
                <div className="relative mb-6 border-b border-white/10 pb-5"><div className="font-mono text-[10px] uppercase tracking-[0.25em] text-synf-400">Collaboration brief</div><h2 className="mt-2 font-display text-2xl font-extrabold">Tell us what you’re imagining.</h2><p className="mt-1 text-sm text-white/50">The more context, the better we can make it real.</p></div>
                <div className="hidden"><label>Company<input value={form.company_website} onChange={e => set('company_website', e.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="label">Full name *</label><input className="input" required value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
                  <div><label className="label">Email *</label><input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></div>
                  <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
                  <div><label className="label">Brand / organisation</label><input className="input" value={form.brand} onChange={e => set('brand', e.target.value)} /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="label">Category</label><select className="input" value={form.category} onChange={e => set('category', e.target.value)}><option value="">Select…</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="label">Event / concept name</label><input className="input" value={form.event_name} onChange={e => set('event_name', e.target.value)} /></div>
                  <div><label className="label">Preferred date</label><input className="input" type="date" value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)} /></div>
                  <div><label className="label">Venue / city</label><input className="input" value={form.venue_city} onChange={e => set('venue_city', e.target.value)} /></div>
                  <div><label className="label">Budget range</label><input className="input" placeholder="e.g. ₹50k–₹1L" value={form.budget_range} onChange={e => set('budget_range', e.target.value)} /></div>
                  <div><label className="label">Audience size</label><input className="input" placeholder="e.g. 300–500" value={form.audience_size} onChange={e => set('audience_size', e.target.value)} /></div>
                </div>
                <div><label className="label">Message *</label><textarea className="input min-h-[120px]" required value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell us about your idea…" /></div>
                <div><label className="label">Relevant links</label><input className="input" placeholder="Website, socials, past work…" value={form.links} onChange={e => set('links', e.target.value)} /></div>
                <label className="flex items-start gap-2 text-xs text-white/60">
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-synf-500" />
                  I agree to be contacted about this enquiry. My data will be stored and used per the <a href="/privacy" className="text-synf-400 underline">Privacy Policy</a>.
                </label>
                {status === 'err' && <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> {err}</div>}
                <button type="submit" disabled={status === 'loading'} className="btn-primary w-full group"><Send size={16} /> {status === 'loading' ? 'Sending…' : <>Send enquiry <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
