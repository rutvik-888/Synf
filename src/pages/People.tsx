import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PersonRow, DepartmentRow } from '@/lib/types';
import { PersonCard } from '@/components/PersonCard';
import { Reveal } from '@/components/Reveal';
import { Users, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function People() {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');

  useEffect(() => {
    (async () => {
      const [peopleRes, deptRes] = await Promise.all([
        supabase.from('people').select('*').eq('status', 'approved').order('sort_order'),
        supabase.from('departments').select('id,name,group_label,sort_order,is_active').eq('is_active', true).order('sort_order'),
      ]);
      setPeople((peopleRes.data as PersonRow[]) || []);
      setDepartments((deptRes.data as DepartmentRow[]) || []);
      setLoading(false);
    })();
  }, []);

  // Build the filter list from departments actually used by approved people,
  // so visitors only see categories that have someone in them.
  const usedDeptIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of people) {
      if (p.category) set.add(p.category);
      if (p.secondary_category) set.add(p.secondary_category);
    }
    return set;
  }, [people]);

  const filters = useMemo(() => {
    return departments
      .filter(d => usedDeptIds.has(d.id))
      .map(d => ({ key: d.id, label: d.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [departments, usedDeptIds]);

  const filtered = cat === 'all'
    ? people
    : people.filter(p => p.category === cat || p.secondary_category === cat);

  return (
    <div className="bg-ink-950">
      {/* Header */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-violet-500/20 to-transparent" />
          <div className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-tl from-synf-600/15 to-transparent" />
        </div>
        <div className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-synf-500/12 blur-[120px] animate-float" />
        <div className="absolute -right-40 bottom-0 h-[25rem] w-[25rem] rounded-full bg-violet-500/12 blur-[100px] animate-float" style={{ animationDelay: '5s' }} />
        <div className="grain pointer-events-none absolute inset-0 opacity-10" />
        <div className="container-synf relative">
          <Reveal className="section-eyebrow"><Users size={14} /> People</Reveal>
          <Reveal><h1 className="display-xl text-[clamp(2.5rem,10vw,8rem)]">The <span className="text-gradient-vibe">collective.</span></h1></Reveal>
          <Reveal delay={150}><p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">The students, DJs, creatives and collaborators behind every Team Synf night.</p></Reveal>
          {!loading && <Reveal delay={250} className="mt-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-white/40"><span className="text-synf-400">{people.length} people</span><span className="text-white/20">/</span><span>{filters.length} disciplines</span></Reveal>}
        </div>
      </section>

      {/* Filters */}
      <section className="container-synf pb-8">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/35"><span className="h-px w-8 bg-synf-500/60" /> Filter the collective</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCat('all')}
            className={`chip border transition-all duration-300 ${cat === 'all' ? 'border-synf-500/40 bg-synf-500/20 text-synf-300' : 'border-white/10 bg-ink-900 text-white/60 hover:border-white/20 hover:text-white'}`}
          >
            Everyone
          </button>
          {filters.map(c => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`chip border transition-all duration-300 ${cat === c.key ? 'border-synf-500/40 bg-synf-500/20 text-synf-300' : 'border-white/10 bg-ink-900 text-white/60 hover:border-white/20 hover:text-white'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="container-synf pb-24">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/5] animate-pulse rounded-2xl bg-ink-900" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Users className="mx-auto h-10 w-10 text-ink-500" />
            <h2 className="mt-4 font-display text-2xl font-extrabold">No profiles published yet</h2>
            <p className="mt-2 text-white/50">Team Synf members and collaborators will appear here once approved by an admin.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p, i) => <Reveal key={p.id} delay={i * 60} direction="scale"><PersonCard person={p} /></Reveal>)}
          </div>
        )}
      </section>

      {/* Join CTA */}
      <section className="container-synf pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 to-ink-800 p-10 text-center sm:p-16">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-synf-500/15 blur-3xl" />
            <div className="relative">
              <div className="section-eyebrow justify-center"><Sparkles size={14} /> Join us</div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Want to be part of this?</h2>
              <p className="mx-auto mt-3 max-w-md text-white/60">We're always looking for students and creatives to join the collective.</p>
              <Link to="/apply" className="btn-primary btn-lg mt-8 group">Apply to join <ArrowRight /></Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
