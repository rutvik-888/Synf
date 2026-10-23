import { useEffect, useMemo, useState } from 'react';
import { Search, Calendar, Flame, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { EventRow } from '@/lib/types';
import { EventCard } from '@/components/EventCard';
import { Reveal } from '@/components/Reveal';
import { useSeo, collectionPageJsonLd } from '@/lib/seo';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'announced', label: 'Announced' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Past' },
  { key: 'postponed', label: 'Postponed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'sold_out', label: 'Sold out' },
];

export function EventsArchive() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [city, setCity] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('events').select('*').eq('is_published', true).order('start_at', { ascending: false, nullsFirst: false });
      setEvents((data as EventRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(() => Array.from(new Set(events.map(e => e.venue_city).filter(Boolean))) as string[], [events]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (status !== 'all' && e.status !== status) return false;
      if (city !== 'all' && e.venue_city !== city) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${e.title} ${e.subtitle || ''} ${e.venue_name || ''} ${e.venue_city || ''} ${e.category || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, status, city, query]);

  const upcoming = filtered.filter(e => ['announced', 'upcoming'].includes(e.status));
  const past = filtered.filter(e => ['completed', 'cancelled', 'postponed'].includes(e.status));

  useSeo({
    title: 'Events — Parties, DJ Nights & Experiences in Hyderabad',
    description: `Browse all Team Synf events — ${events.length} parties, DJ nights and curated experiences across Hyderabad. Upcoming events, past archive and ticket links.`,
    path: '/events',
    keywords: ['Team Synf events', 'Hyderabad events', 'Hyderabad parties', 'DJ nights Hyderabad', 'nightlife Hyderabad', 'college events', 'music events India', 'event archive'],
    jsonLd: collectionPageJsonLd('Team Synf Events', '/events', events.length),
  });

  return (
    <div className="bg-ink-950 min-h-screen">
      {/* Header with colour blocks */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-synf-600/20 to-transparent" />
          <div className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-tl from-electric-500/15 to-transparent" />
        </div>
        <div className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-synf-500/15 blur-[120px] animate-float" />
        <div className="absolute -right-40 bottom-0 h-[25rem] w-[25rem] rounded-full bg-acid-400/10 blur-[100px] animate-float" style={{ animationDelay: '5s' }} />
        <div className="grain pointer-events-none absolute inset-0 opacity-10" />
        <div className="container-synf relative">
          <Reveal className="section-eyebrow"><Calendar size={14} /> Events</Reveal>
          <Reveal>
            <h1 className="display-xl text-[clamp(2.5rem,10vw,8rem)]">
              Every night,<br /><span className="text-gradient-vibe">a story.</span>
            </h1>
          </Reveal>
          <Reveal delay={150}><p className="mt-6 max-w-xl text-lg text-white/70">Parties, DJ nights and curated experiences. Browse what's coming and where we've been.</p></Reveal>
          {!loading && (
            <Reveal delay={250} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-widest text-white/40">
              <span>{events.length} total</span>
              <span className="text-synf-400">{upcoming.length} upcoming</span>
              <span>{past.length} in archive</span>
            </Reveal>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="container-synf pb-10">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-900/60 p-4 backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input className="input pl-9" placeholder="Search events, venues, cities…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map(s => (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className={`chip border transition-all duration-300 ${status === s.key ? 'border-synf-500/40 bg-synf-500/20 text-synf-300' : 'border-white/10 bg-ink-900 text-white/60 hover:border-white/25 hover:text-white'}`}
              >
                {s.label}
              </button>
            ))}
            {cities.length > 0 && (
              <select className="input ml-auto w-auto py-1.5 text-xs" value={city} onChange={e => setCity(e.target.value)}>
                <option value="all">All cities</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="container-synf py-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-ink-900" />)}
          </div>
        </section>
      ) : filtered.length === 0 ? (
        <section className="container-synf py-24 text-center">
          <SlidersHorizontal className="mx-auto h-10 w-10 text-ink-500" />
          <h2 className="mt-4 font-display text-2xl font-extrabold">No events match your filters</h2>
          <p className="mt-2 text-white/50">Try clearing your search or check back soon — we're always planning.</p>
        </section>
      ) : (
        <div className="container-synf pb-24 space-y-20">
          {upcoming.length > 0 && (
            <section>
              <div className="mb-8 flex items-center gap-3">
                <Flame size={20} className="text-synf-400" />
                <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Upcoming</h2>
                <span className="chip border border-synf-500/30 bg-synf-500/10 text-synf-300">{upcoming.length}</span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((e, i) => <Reveal key={e.id} delay={i * 80}><EventCard event={e} /></Reveal>)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <div className="mb-8 flex items-center gap-3">
                <Calendar size={20} className="text-white/40" />
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-white/70 sm:text-3xl">Archive</h2>
                <span className="chip border border-white/10 bg-white/5 text-white/50">{past.length}</span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((e, i) => <Reveal key={e.id} delay={i * 80}><EventCard event={e} /></Reveal>)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
