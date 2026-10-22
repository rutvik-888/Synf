import { useEffect, useState } from 'react';
import { Briefcase, ArrowRight, MapPin, Calendar, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { JobPostingRow } from '@/lib/types';
import { JOB_ARRANGEMENT_LABELS } from '@/lib/types';
import { Reveal } from '@/components/Reveal';
import { formatDate } from '@/lib/format';

export function Jobs() {
  const [jobs, setJobs] = useState<JobPostingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'published')
        .lte('application_open', today)
        .order('created_at', { ascending: false });
      // Filter out closed deadlines client-side
      const open = ((data as JobPostingRow[]) || []).filter(j => !j.application_close || j.application_close >= today);
      setJobs(open);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="bg-ink-950">
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-acid-400/15 to-transparent" />
          <div className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-tl from-electric-500/12 to-transparent" />
        </div>
        <div className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-acid-400/10 blur-[120px] animate-float" />
        <div className="absolute -right-40 bottom-0 h-[25rem] w-[25rem] rounded-full bg-electric-500/10 blur-[100px] animate-float" style={{ animationDelay: '5s' }} />
        <div className="grain pointer-events-none absolute inset-0 opacity-10" />
        <div className="container-synf relative">
          <Reveal className="section-eyebrow"><Sparkles size={14} /> Join the team</Reveal>
          <Reveal><h1 className="display-xl text-balance text-[clamp(2.5rem,10vw,8rem)]">Open <span className="text-gradient-vibe">roles.</span></h1></Reveal>
          <Reveal delay={150}><p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">Students and creatives who want to help build nights that matter. Browse open positions and apply directly.</p></Reveal>
          {!loading && <Reveal delay={250} className="mt-6 flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-white/40"><span className="text-acid-400">{jobs.length} open roles</span><span className="text-white/20">/</span><span>Build the next night</span></Reveal>}
        </div>
      </section>

      <section className="container-synf pb-24">
        <div className="mb-8 grid gap-4 border-y border-white/10 py-5 sm:grid-cols-3">
          {['Real responsibility', 'Flexible around college', 'Built with a crew'].map((item, i) => <div key={item} className="flex items-center gap-3 text-sm text-white/60"><span className="font-mono text-xs text-synf-400">0{i + 1}</span>{item}</div>)}
        </div>
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-ink-900" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="card p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-ink-500" />
            <h2 className="mt-4 font-display text-2xl font-extrabold">No open positions right now</h2>
            <p className="mt-2 text-white/60">Follow <a href="https://www.instagram.com/team.synf/" target="_blank" rel="noopener noreferrer" className="text-synf-400 underline">@team.synf</a> on Instagram for new openings, or <Link to="/collaborate" className="text-synf-400 underline">send a collaboration enquiry</Link>.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((j, i) => (
              <Reveal key={j.id} delay={i * 80} direction="scale">
                <Link to={`/jobs/${j.slug}`} className="group card block p-6 transition-all hover:border-synf-500/40 hover:shadow-[0_0_40px_-15px] hover:shadow-synf-500/30">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full border border-synf-500/25 bg-synf-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-synf-300">{j.department}</span>
                    <span className="text-right text-[10px] uppercase tracking-widest text-ink-500">{JOB_ARRANGEMENT_LABELS[j.arrangement]}</span>
                  </div>
                  <h3 className="mt-4 font-display text-xl font-extrabold text-white group-hover:text-synf-400">{j.title}</h3>
                  {j.description && <p className="mt-2 line-clamp-3 text-sm text-white/60">{j.description}</p>}
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-500">
                    {j.num_openings && <span>{j.num_openings} opening{j.num_openings > 1 ? 's' : ''}</span>}
                    {j.application_close && <span className="flex items-center gap-1"><Calendar size={12} /> Closes {formatDate(j.application_close)}</span>}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-synf-400">Apply now <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
