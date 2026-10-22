import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { SiteContentRow, PersonRow } from '@/lib/types';
import { Reveal } from '@/components/Reveal';
import { Sparkles, Flame, ArrowRight, ArrowUpRight, Calendar, Users, Zap, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PersonCard } from '@/components/PersonCard';

const MANIFESTO = [
  { n: '01', text: 'We believe experiences should be felt, not just attended.', color: 'text-synf-400' },
  { n: '02', text: 'We believe creativity should be seen, heard, and shared.', color: 'text-acid-400' },
  { n: '03', text: 'We bring people, ideas, music, visuals, and moments together.', color: 'text-violet-400' },
  { n: '04', text: 'We build spaces where people connect through experiences.', color: 'text-electric-400' },
  { n: '05', text: 'We care about the atmosphere, the details, the memories people take home.', color: 'text-ember-400' },
];

const VALUES = ['Bold, not chaotic', 'Young, not childish', 'Cinematic, not slow', 'Experimental, not confusing', 'Premium, not corporate', 'Student-led, always'];

export function About() {
  const [content, setContent] = useState<SiteContentRow | null>(null);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: pe }] = await Promise.all([
        supabase.from('site_content').select('*').eq('slug', 'about').maybeSingle(),
        supabase.from('people').select('*').eq('status', 'approved').order('sort_order').limit(4),
      ]);
      setContent(c as SiteContentRow | null);
      setPeople((pe as PersonRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const body = content?.body || 'Team Synf is a student-led collective creating parties, nightlife and curated music experiences. We exist to throw the kind of nights we wish existed — bold, creative and culturally rooted.';
  const tagline = content?.data && (content.data as { tagline?: string }).tagline || 'Student-led. Collaborative. Creative.';

  return (
    <div className="bg-ink-950">

      {/* ============ OPENING STATEMENT — POSTER HERO ============ */}
      <section className="relative min-h-[92vh] overflow-hidden">
        {/* Colour-blocked background */}
        <div className="absolute inset-0">
          <div className="absolute left-0 top-0 h-1/2 w-full bg-gradient-to-br from-synf-600/30 via-violet-600/15 to-transparent" />
          <div className="absolute bottom-0 right-0 h-1/2 w-2/3 bg-gradient-to-tl from-acid-400/15 via-electric-500/10 to-transparent" />
        </div>
        {/* Floating orbs */}
        <div className="absolute -left-40 top-20 h-[38rem] w-[38rem] rounded-full bg-synf-500/20 blur-[130px] animate-float" />
        <div className="absolute -right-40 bottom-20 h-[30rem] w-[30rem] rounded-full bg-violet-500/20 blur-[130px] animate-float" style={{ animationDelay: '5s' }} />
        <div className="grain pointer-events-none absolute inset-0 opacity-15" />

        {/* Rotated metadata stamps */}
        <div className="absolute right-6 top-24 hidden rotate-[6deg] sm:block">
          <div className="rounded-full border-2 border-acid-400/50 px-4 py-2 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-acid-400">Manifesto</div>
            <div className="font-display text-sm font-extrabold text-white">EST. HYD</div>
          </div>
        </div>
        <div className="absolute left-6 bottom-32 hidden rotate-[-8deg] sm:block">
          <div className="rounded-full border-2 border-violet-400/50 px-4 py-2 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-violet-300">After</div>
            <div className="font-display text-sm font-extrabold text-white">DARK</div>
          </div>
        </div>

        <div className="container-synf relative flex min-h-[92vh] flex-col justify-center py-24">
          <Reveal className="mb-8 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.35em] text-white/60">
            <Sparkles size={14} className="text-synf-400" /> The manifesto
          </Reveal>

          <Reveal delay={80} direction="up">
            <h1 className="font-display font-extrabold leading-[0.8] tracking-tightest">
              <span className="block text-[clamp(3rem,14vw,12rem)] text-white">WE MAKE</span>
              <span className="block text-[clamp(3rem,14vw,12rem)]">
                <span className="text-gradient-vibe">NOISE.</span>
              </span>
              <span className="block text-[clamp(3rem,14vw,12rem)]">
                <span className="text-outline">WE MAKE</span>
              </span>
              <span className="block text-[clamp(3rem,14vw,12rem)] text-white">MEMORIES<span className="text-synf-500">.</span></span>
            </h1>
          </Reveal>

          <Reveal delay={260} className="mt-10 max-w-2xl">
            <p className="text-lg leading-relaxed text-white/80 sm:text-xl">{tagline}</p>
          </Reveal>

          <Reveal delay={420} className="mt-10 flex flex-wrap gap-3">
            <Link to="/events" className="btn-primary group">Explore events <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
            <Link to="/jobs" className="btn-ghost group">Join the collective <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
          </Reveal>

          {/* Scroll cue */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="flex flex-col items-center gap-2 text-white/40">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Keep going</span>
              <ArrowRight size={18} className="rotate-90 animate-bounce-subtle" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ MANIFESTO LIST — EDITORIAL ============ */}
      <section className="relative border-y border-white/10 bg-ink-900/40">
        <div className="container-synf py-24 sm:py-32">
          <Reveal className="section-eyebrow"><Flame size={14} /> What we believe</Reveal>
          <Reveal delay={80}>
            <h2 className="mb-16 max-w-3xl font-display text-4xl font-extrabold leading-[0.9] tracking-tightest sm:text-6xl">
              Not an agency. Not a <span className="text-outline">template.</span><br />A <span className="text-gradient-vibe">movement.</span>
            </h2>
          </Reveal>

          <div className="divide-y divide-white/10">
            {MANIFESTO.map((m, i) => (
              <Reveal key={m.n} delay={i * 100}>
                <div className="group flex items-start gap-6 py-8 transition-colors hover:bg-white/[0.02] sm:items-center sm:gap-10 sm:py-10">
                  <span className={`font-mono text-2xl font-bold sm:text-4xl ${m.color}`}>{m.n}</span>
                  <p className="font-display text-xl font-extrabold leading-tight tracking-tight text-white/85 transition-colors group-hover:text-white sm:text-3xl sm:leading-[1.1]">
                    {m.text}
                  </p>
                  <ArrowUpRight size={24} className="ml-auto hidden shrink-0 text-white/20 transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-synf-400 sm:block" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STORY — WIDE QUOTE ============ */}
      <section className="container-synf py-24 sm:py-32">
        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-ink-900" />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_2.5fr] lg:gap-16">
            <Reveal>
              <div className="sticky top-24">
                <div className="section-eyebrow"><Volume2 size={14} /> The story</div>
                <p className="font-display text-2xl font-extrabold leading-tight text-white/40">What we're built on.</p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="max-w-3xl whitespace-pre-wrap text-xl leading-[1.7] text-white/85 sm:text-2xl">{body}</div>
            </Reveal>
          </div>
        )}
      </section>

      {/* ============ VALUES — COLOUR TICKER ============ */}
      <section className="border-y border-white/10 bg-gradient-to-r from-synf-600/10 via-violet-600/10 to-electric-500/10">
        <div className="container-synf py-10">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 font-display text-sm font-bold uppercase tracking-widest text-white/50 sm:text-base">
            {VALUES.map((v, i) => (
              <Reveal key={v} delay={i * 60} className="flex items-center gap-8">
                <span className="transition-colors hover:text-acid-400">{v}</span>
                <span className="text-synf-500/50">/</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ THE COLLECTIVE PREVIEW ============ */}
      {people.length > 0 && (
        <section className="container-synf py-24 sm:py-32">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Reveal className="section-eyebrow"><Users size={14} /> The collective</Reveal>
              <Reveal>
                <h2 className="font-display text-4xl font-extrabold leading-[0.9] tracking-tightest sm:text-6xl">
                  Humans behind<br />the <span className="text-gradient-vibe">nights.</span>
                </h2>
              </Reveal>
            </div>
            <Link to="/people" className="group inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-synf-400">
              Meet everyone <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {people.map((p, i) => <Reveal key={p.id} delay={i * 80}><PersonCard person={p} /></Reveal>)}
          </div>
        </section>
      )}

      {/* ============ PILLARS — POSTER GRID ============ */}
      <section className="container-synf py-24 sm:py-32">
        <Reveal className="section-eyebrow"><Zap size={14} /> What we do</Reveal>
        <Reveal delay={80}>
          <h2 className="mb-12 font-display text-4xl font-extrabold leading-[0.9] tracking-tightest sm:text-6xl">Three things,<br />done <span className="text-gradient-vibe">properly.</span></h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Flame, title: 'Parties', body: 'Full-spectrum nightlife — from intimate parties to big-room energy. Every event built from scratch.', color: 'from-synf-600/30 to-transparent', accent: 'text-synf-400', border: 'hover:border-synf-500/50' },
            { icon: Volume2, title: 'Music', body: 'DJ nights and curated lineups across genres that move the room. Bollywood, house, hip-hop, commercial.', color: 'from-acid-400/20 to-transparent', accent: 'text-acid-400', border: 'hover:border-acid-400/50' },
            { icon: Users, title: 'Culture', body: 'Collaborations with creatives, brands and venues that push things forward in Hyderabad.', color: 'from-violet-500/25 to-transparent', accent: 'text-violet-300', border: 'hover:border-violet-400/50' },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={i} delay={i * 120}>
                <div className={`group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-ink-900 p-8 transition-all duration-500 ${c.border}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                  <div className="relative">
                    <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-ink-950">
                      <Icon size={26} className={c.accent} />
                    </div>
                    <h3 className={`font-display text-2xl font-extrabold tracking-tight ${c.accent}`}>{c.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">{c.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ============ CLOSING INVITATION — HIGH CONTRAST ============ */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-synf-600 via-violet-600 to-electric-500">
          <div className="grain pointer-events-none absolute inset-0 opacity-20" />
          <div className="container-synf relative py-24 sm:py-32">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-white/80">The invitation</p>
              <h2 className="mt-6 max-w-4xl font-display text-4xl font-extrabold leading-[0.85] tracking-tightest text-white sm:text-6xl lg:text-7xl">
                The night is what<br />we make of it.<br />Come make it <span className="text-outline-acid">with us.</span>
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/events" className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-bold text-ink-950 transition-all hover:scale-105 hover:shadow-2xl">
                  <Calendar size={18} /> Explore events <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/jobs" className="group inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-7 py-4 text-sm font-bold text-white transition-all hover:border-white hover:bg-white/10">
                  <Users size={18} /> Join the collective <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/collaborate" className="group inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-7 py-4 text-sm font-bold text-white transition-all hover:border-white hover:bg-white/10">
                  <Sparkles size={18} /> Collaborate <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
