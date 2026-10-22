import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Calendar, MapPin, Users, Mail, Ticket, ChevronDown, Flame, Zap, Sparkles, Volume2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { EventRow, PersonRow, SiteContentRow } from '@/lib/types';
import { EventCard } from '@/components/EventCard';
import { PersonCard } from '@/components/PersonCard';
import { Reveal } from '@/components/Reveal';
import { MagneticButton } from '@/components/MagneticButton';
import { formatDate, countdown } from '@/lib/format';
import { submitPublicForm } from '@/lib/api';
import { SynfMark } from '@/components/SynfMark';
import { ParticleField } from '@/components/ParticleField';

const MARQUEE_A = ['WE DON\'T DO ORDINARY', 'PARTIES', 'NIGHTLIFE', 'DJ NIGHTS', 'CURATED EXPERIENCES', 'HYDERABAD', 'STUDENT-LED', 'AFTER DARK'];
const MARQUEE_B = ['MUSIC', 'CULTURE', 'PEOPLE', 'MOMENTS', 'COLLABORATE', 'CREATE', 'TEAM SYNF', 'LESS ORDINARY'];

export function Home() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [content, setContent] = useState<SiteContentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 0.5, y: 0.4 });

  useEffect(() => {
    (async () => {
      const [{ data: ev }, { data: pe }, { data: sc }] = await Promise.all([
        supabase.from('events').select('*').eq('is_published', true).order('start_at', { ascending: false }).limit(8),
        supabase.from('people').select('*').eq('status', 'approved').order('sort_order').limit(8),
        supabase.from('site_content').select('*').eq('slug', 'home_hero').maybeSingle(),
      ]);
      setEvents((ev as EventRow[]) || []);
      setPeople((pe as PersonRow[]) || []);
      setContent(sc as SiteContentRow | null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (heroBgRef.current) {
          heroBgRef.current.style.transform = `translateY(${window.scrollY * 0.35}px) scale(1.15)`;
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setSpot({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  const heroData = content?.data as { headline?: string; subhead?: string } | null;
  const subhead = heroData?.subhead || 'Student-led collective. Parties, nightlife, DJ nights and curated experiences across Hyderabad.';

  const upcoming = events.filter(e => ['announced', 'upcoming'].includes(e.status));
  const featured = events.find(e => e.featured) || events[0];
  const past = events.filter(e => e.status === 'completed').slice(0, 6);
  const cd = featured ? countdown(featured.start_at) : null;

  return (
    <div className="bg-ink-950">

      {/* ============ HERO: POSTER CAMPAIGN ============ */}
      <section ref={heroRef} className="relative min-h-screen overflow-hidden">
        {/* Background image with parallax */}
        {featured?.cover_image_url && (
          <div ref={heroBgRef} className="absolute inset-0" style={{ transform: 'translateY(0px) scale(1.15)' }}>
            <img src={featured.cover_image_url} alt="" className="h-full w-full object-cover opacity-40" loading="eager" fetchPriority="high" decoding="async" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/50 to-ink-950" />
          </div>
        )}

        {/* Mouse spotlight */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(700px circle at ${spot.x * 100}% ${spot.y * 100}%, rgba(255,45,111,0.22), transparent 55%)` }}
        />

        {/* Animated colour orbs */}
        <div className="absolute inset-0">
          <div className="gpu absolute -left-40 -top-40 h-[42rem] w-[42rem] rounded-full bg-synf-500/25 blur-[130px] animate-float" />
          <div className="gpu absolute -right-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-violet-500/20 blur-[130px] animate-float" style={{ animationDelay: '5s' }} />
          <div className="gpu absolute bottom-0 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-acid-400/10 blur-[110px] animate-float" style={{ animationDelay: '10s' }} />
        </div>
        <ParticleField density="low" interactive colorPalette="mixed" />
        <div className="grain pointer-events-none absolute inset-0 opacity-15" />

        {/* Vertical side label */}
        <div className="absolute left-4 top-1/2 hidden -translate-y-1/2 rotate-180 lg:block">
          <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/40 [writing-mode:vertical-rl]">Team Synf · Est. Hyderabad · After Dark</span>
        </div>

        {/* Rotated event-stamp top right */}
        <div className="absolute right-6 top-24 hidden rotate-[8deg] sm:block">
          <div className="rounded-full border-2 border-acid-400/50 px-4 py-2 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-acid-400">Live Now</div>
            <div className="font-display text-sm font-extrabold text-white">HYD · IN</div>
          </div>
        </div>

        <div className="container-synf relative flex min-h-screen flex-col justify-center py-24">
          {/* Eyebrow + logo chip */}
          <Reveal className="mb-8 flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl bg-white shadow-[0_0_30px_-8px] shadow-synf-500/50">
              <SynfMark className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-white/60">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-synf-500" /> Live culture · Hyderabad
            </div>
          </Reveal>

          {/* Oversized overlapping headline */}
          <Reveal delay={80} direction="up">
            <h1 className="font-display font-extrabold leading-[0.82] tracking-tightest">
              <span className="block text-[clamp(3.5rem,15vw,13rem)] text-white">WE</span>
              <span className="block text-[clamp(3.5rem,15vw,13rem)]">
                <span className="text-outline">DON'T</span>{' '}
                <span className="text-gradient-vibe">DO</span>
              </span>
              <span className="block text-[clamp(3.5rem,15vw,13rem)] text-white">ORDINARY<span className="text-synf-500">.</span></span>
            </h1>
          </Reveal>

          {/* Subhead + CTAs */}
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <Reveal delay={220}>
              <p className="max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">{subhead}</p>
            </Reveal>
            <Reveal delay={380}>
              <div className="flex flex-wrap gap-3">
                <MagneticButton>
                  <Link to="/events" className="btn-primary btn-lg group">
                    <Calendar size={18} /> Explore events
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </MagneticButton>
                <MagneticButton strength={0.25}>
                  <Link to="/about" className="btn-ghost btn-lg group">
                    <Sparkles size={16} /> The collective
                  </Link>
                </MagneticButton>
              </div>
            </Reveal>
          </div>

          {/* Stats rail with countdown */}
          <Reveal delay={560} className="mt-14">
            <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-center">
              {cd && !cd.past && featured && (
                <div className="inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-900/70 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-synf-400"><Flame size={14} /> Next drop</div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex items-center gap-4 font-mono">
                    {[['D', cd.days], ['H', cd.hours], ['M', cd.mins], ['S', cd.secs]].map(([l, v]) => (
                      <div key={l as string} className="text-center">
                        <span className="font-display text-2xl font-extrabold text-white">{String(v).padStart(2, '0')}</span>
                        <span className="ml-1 text-xs text-ink-500">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-4">
                {[
                  { label: 'Focus', value: 'Nightlife', icon: Zap, color: 'text-synf-400' },
                  { label: 'Based', value: 'Hyderabad', icon: MapPin, color: 'text-acid-400' },
                  { label: 'Events', value: `${events.length} live`, icon: Calendar, color: 'text-violet-400' },
                  { label: 'Crew', value: `${people.length} listed`, icon: Users, color: 'text-electric-400' },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="group bg-ink-900/70 p-4 transition-colors hover:bg-ink-800/70">
                      <Icon size={16} className={`${s.color} opacity-70 transition-opacity group-hover:opacity-100`} />
                      <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-ink-500">{s.label}</div>
                      <div className="mt-0.5 font-display text-lg font-bold">{s.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2 text-white/40">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Scroll</span>
            <ChevronDown size={20} className="animate-bounce-subtle" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />
      </section>

      {/* ============ DUAL MARQUEE STRIP ============ */}
      <section className="relative border-y border-white/10 bg-ink-900 overflow-hidden">
        <div className="flex w-max animate-marquee gap-0 whitespace-nowrap py-4">
          {Array.from({ length: 4 }).map((_, k) => (
            <div key={k} className="flex items-center">
              {MARQUEE_A.map((t, i) => (
                <span key={i} className="flex items-center">
                  <span className="px-6 font-display text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">{t}</span>
                  <span className="text-2xl text-synf-500">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="flex w-max animate-marquee-rev gap-0 whitespace-nowrap py-4">
          {Array.from({ length: 4 }).map((_, k) => (
            <div key={k} className="flex items-center">
              {MARQUEE_B.map((t, i) => (
                <span key={i} className="flex items-center">
                  <span className="px-6 font-display text-3xl font-extrabold uppercase tracking-tight text-white/15 sm:text-4xl">{t}</span>
                  <span className="text-2xl text-acid-400/50">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURED EVENT — POSTER CAMPAIGN ============ */}
      {featured && (
        <section className="container-synf py-24 sm:py-32">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal direction="scale">
              <Link to={`/events/${featured.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-3xl sm:aspect-[4/3]">
                {featured.cover_image_url ? (
                  <img src={featured.cover_image_url} alt={featured.cover_image_alt || featured.title} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 via-synf-600 to-ink-950">
                    <span className="font-display text-[14rem] font-extrabold text-white/10">{featured.title.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent" />
                <div className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full bg-synf-500 text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-0.5" />
                </div>
                {featured.featured && (
                  <span className="absolute left-4 top-4 chip border border-acid-400/40 bg-acid-400/20 text-acid-400 backdrop-blur-sm">Featured</span>
                )}
                {/* Oversized date stamp */}
                {featured.start_at && (
                  <div className="absolute bottom-4 left-4 rotate-[-4deg] rounded-xl border-2 border-white/20 bg-ink-950/80 px-3 py-2 text-center backdrop-blur-sm">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-synf-400">{new Date(featured.start_at).toLocaleDateString('en-GB', { month: 'short' })}</div>
                    <div className="font-display text-3xl font-extrabold leading-none text-white">{new Date(featured.start_at).getDate()}</div>
                  </div>
                )}
              </Link>
            </Reveal>

            <div className="flex flex-col justify-center">
              <Reveal className="section-eyebrow"><Sparkles size={14} /> Spotlight</Reveal>
              <Reveal delay={100}>
                <span className="chip w-fit border border-synf-500/40 bg-synf-500/15 text-synf-300">{featured.status.replace('_', ' ')}</span>
              </Reveal>
              <Reveal delay={150}>
                <h2 className="mt-4 font-display text-4xl font-extrabold leading-[0.9] tracking-tightest sm:text-6xl lg:text-7xl">{featured.title}</h2>
              </Reveal>
              {featured.subtitle && <Reveal delay={200}><p className="mt-3 text-lg text-white/60">{featured.subtitle}</p></Reveal>}
              <Reveal delay={250}>
                <div className="mt-6 space-y-3 text-sm text-white/75">
                  {featured.start_at && <div className="flex items-center gap-2"><Calendar size={16} className="text-synf-400" /> {formatDate(featured.start_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>}
                  {featured.venue_name && <div className="flex items-center gap-2"><MapPin size={16} className="text-acid-400" /> {featured.venue_name}{featured.venue_city ? `, ${featured.venue_city}` : ''}</div>}
                </div>
              </Reveal>
              <Reveal delay={300}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to={`/events/${featured.slug}`} className="btn-primary group">View event <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
                  {featured.ticket_url && <a href={featured.ticket_url} target="_blank" rel="noopener noreferrer" className="btn-acid"><Ticket size={16} /> Get passes</a>}
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ============ UPCOMING — COLOUR-BLOCK HEADER ============ */}
      {upcoming.length > 0 && (
        <section className="container-synf py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Reveal className="section-eyebrow"><Flame size={14} /> Upcoming</Reveal>
              <Reveal><h2 className="font-display text-4xl font-extrabold leading-[0.9] tracking-tightest sm:text-6xl">Next<span className="text-gradient-vibe"> up</span></h2></Reveal>
            </div>
            <Link to="/events" className="group inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-synf-400">
              All events <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 3).map((e, i) => <Reveal key={e.id} delay={i * 100}><EventCard event={e} /></Reveal>)}
          </div>
        </section>
      )}

      {/* ============ PAST ARCHIVE — HORIZONTAL STRIP ============ */}
      {past.length > 0 && (
        <section className="py-20">
          <div className="container-synf">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Reveal className="section-eyebrow"><Volume2 size={14} /> Archive</Reveal>
                <Reveal><h2 className="font-display text-4xl font-extrabold leading-[0.9] tracking-tightest sm:text-6xl">Where we've<span className="text-outline-acid"> been</span></h2></Reveal>
              </div>
              <Link to="/events" className="group inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-synf-400">
                Full archive <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
          <div className="mt-8 flex gap-6 overflow-x-auto px-5 pb-6 sm:px-8 scrollbar-hide snap-x snap-mandatory">
            {past.map((e) => (
              <div key={e.id} className="w-[80vw] flex-shrink-0 snap-center sm:w-[24rem]">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ EMPTY STATE ============ */}
      {loading ? (
        <section className="container-synf py-20"><div className="h-64 animate-pulse rounded-2xl bg-ink-900" /></section>
      ) : events.length === 0 && (
        <section className="container-synf py-24 text-center">
          <Reveal>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">No events published yet</h2>
            <p className="mx-auto mt-3 max-w-md text-white/60">Team Synf is cooking something up. Follow along on Instagram or join the insider list to be first to know.</p>
            <div className="mt-6 flex justify-center gap-3">
              <a href="https://www.instagram.com/team.synf/" target="_blank" rel="noopener noreferrer" className="btn-ghost">@team.synf</a>
              <Link to="/apply" className="btn-primary">Join the team</Link>
            </div>
          </Reveal>
        </section>
      )}

      {/* ============ PEOPLE PREVIEW — CREW STRIP ============ */}
      {people.length > 0 && (
        <section className="container-synf py-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Reveal className="section-eyebrow"><Users size={14} /> The collective</Reveal>
              <Reveal><h2 className="font-display text-4xl font-extrabold leading-[0.9] tracking-tightest sm:text-6xl">People behind<br className="sm:hidden" /> the nights</h2></Reveal>
            </div>
            <Link to="/people" className="group inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-synf-400">
              All people <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {people.slice(0, 4).map((p, i) => <Reveal key={p.id} delay={i * 80}><PersonCard person={p} /></Reveal>)}
          </div>
        </section>
      )}

      {/* ============ INSIDER SIGNUP — ACID BLOCK ============ */}
      <InsiderSignup />

      {/* ============ COLLABORATION CTA — VIOLET BLOCK ============ */}
      <section className="container-synf py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 via-ink-900 to-ink-950 p-10 sm:p-16 lg:p-20">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-synf-500/25 blur-3xl animate-float" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-electric-500/15 blur-3xl animate-float" style={{ animationDelay: '7s' }} />
            <div className="relative">
              <div className="section-eyebrow text-violet-300"><Sparkles size={14} /> Collaborate</div>
              <h2 className="max-w-2xl font-display text-3xl font-extrabold leading-[0.9] tracking-tightest sm:text-5xl lg:text-6xl">
                Build something <span className="text-gradient-vibe">unforgettable</span> with us.
              </h2>
              <p className="mt-4 max-w-xl text-white/75">Brands, venues, DJs, artists, photographers and creatives — we're open to collaborations that push the culture forward.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/collaborate" className="btn-primary btn-lg group">Collaborate <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
                <Link to="/jobs" className="btn-ghost btn-lg">Join the team</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function InsiderSignup() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    const consent = 'I agree to receive insider updates from Team Synf. I can unsubscribe at any time.';
    const r = await submitPublicForm({ kind: 'subscriber', email, first_name: firstName, consent_text: consent });
    if (r.error) { setStatus('err'); setMsg(r.error); }
    else { setStatus('ok'); setMsg('You\'re on the list. Check your inbox.'); setEmail(''); setFirstName(''); }
  }

  return (
    <section className="container-synf py-20">
      <Reveal>
        <div className="relative grid gap-8 overflow-hidden rounded-3xl border border-acid-400/30 bg-gradient-to-br from-acid-400/10 via-ink-900 to-ink-950 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-acid-400/15 blur-3xl" />
          <div className="relative">
            <div className="section-eyebrow text-acid-400"><Mail size={14} /> Insider list</div>
            <h2 className="font-display text-3xl font-extrabold leading-[0.9] tracking-tightest sm:text-5xl">First to know.<br />First <span className="text-gradient-acid">in.</span></h2>
            <p className="mt-3 max-w-md text-white/70">Get early event announcements, recruitment openings and behind-the-scenes drops. No spam, ever.</p>
          </div>
          <form onSubmit={submit} className="relative space-y-3" aria-label="Insider signup form">
            <div className="hidden"><label>Don't fill this<input value="" tabIndex={-1} autoComplete="off" /></label></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" placeholder="First name (optional)" value={firstName} onChange={e => setFirstName(e.target.value)} />
              <input className="input" type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <label className="flex items-start gap-2 text-xs text-white/50">
              <input type="checkbox" required className="mt-0.5 accent-acid-400" />
              I agree to receive insider updates from Team Synf. I can unsubscribe at any time.
            </label>
            <button type="submit" disabled={status === 'loading'} className="btn-primary w-full group">
              {status === 'loading' ? 'Joining…' : <>Join the insider list <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
            </button>
            {status === 'ok' && <p className="text-sm text-acid-400">{msg}</p>}
            {status === 'err' && <p className="text-sm text-synf-400">{msg}</p>}
          </form>
        </div>
      </Reveal>
    </section>
  );
}
