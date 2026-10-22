import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Calendar, Briefcase, Users, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { JobPostingRow } from '@/lib/types';
import { JOB_ARRANGEMENT_LABELS } from '@/lib/types';
import { Reveal } from '@/components/Reveal';
import { formatDate } from '@/lib/format';

export function JobDetail() {
  const { slug } = useParams();
  const [job, setJob] = useState<JobPostingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);

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

  if (loading) return <div className="container-synf py-24"><div className="h-64 animate-pulse rounded-2xl bg-ink-900" /></div>;
  if (!job) return (
    <div className="container-synf py-24 text-center">
      <Briefcase className="mx-auto h-12 w-12 text-ink-500" />
      <h1 className="mt-4 font-display text-2xl font-extrabold">Job not found</h1>
      <p className="mt-2 text-white/60">This position may have been closed or removed.</p>
      <Link to="/jobs" className="btn-primary mt-6">View all open roles</Link>
    </div>
  );

  return (
    <div className="bg-ink-950">
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-synf-500/10 blur-[120px]" />
        <div className="container-synf relative">
          <Link to="/jobs" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={16} /> All open roles</Link>
          <Reveal className="section-eyebrow"><Sparkles size={14} /> {job.department}</Reveal>
          <Reveal><h1 className="display-xl text-balance text-[clamp(2rem,7vw,5rem)]">{job.title}</h1></Reveal>
          <Reveal delay={150}>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/60">
              <span className="flex items-center gap-1"><Briefcase size={14} /> {JOB_ARRANGEMENT_LABELS[job.arrangement]}</span>
              {job.num_openings && <span className="flex items-center gap-1"><Users size={14} /> {job.num_openings} opening{job.num_openings > 1 ? 's' : ''}</span>}
              {job.application_close && <span className="flex items-center gap-1"><Calendar size={14} /> Closes {formatDate(job.application_close)}</span>}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-synf pb-24">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {job.description && (
              <div><h2 className="font-display text-xl font-extrabold text-synf-400">About the role</h2><p className="mt-3 whitespace-pre-wrap leading-relaxed text-white/80">{job.description}</p></div>
            )}
            {job.responsibilities && (
              <div><h2 className="font-display text-xl font-extrabold text-synf-400">Responsibilities</h2><p className="mt-3 whitespace-pre-wrap leading-relaxed text-white/80">{job.responsibilities}</p></div>
            )}
            {job.eligibility && (
              <div><h2 className="font-display text-xl font-extrabold text-synf-400">Eligibility</h2><p className="mt-3 whitespace-pre-wrap leading-relaxed text-white/80">{job.eligibility}</p></div>
            )}
            {(job.required_skills && job.required_skills.length > 0) && (
              <div><h2 className="font-display text-xl font-extrabold text-synf-400">Required skills</h2><div className="mt-3 flex flex-wrap gap-2">{job.required_skills.map(s => <span key={s} className="chip border border-synf-500/30 bg-synf-500/10 text-synf-300">{s}</span>)}</div></div>
            )}
            {(job.preferred_skills && job.preferred_skills.length > 0) && (
              <div><h2 className="font-display text-xl font-extrabold text-synf-400">Preferred skills</h2><div className="mt-3 flex flex-wrap gap-2">{job.preferred_skills.map(s => <span key={s} className="chip border border-white/10 bg-ink-900 text-white/70">{s}</span>)}</div></div>
            )}
          </div>

          {/* Apply sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24 p-6">
              {closed ? (
                <div className="text-center">
                  <AlertCircle className="mx-auto h-10 w-10 text-synf-400" />
                  <h3 className="mt-3 font-display text-lg font-extrabold">Applications closed</h3>
                  <p className="mt-1 text-sm text-white/60">The deadline for this position was {formatDate(job.application_close)}.</p>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-lg font-extrabold">Ready to apply?</h3>
                  <p className="mt-1 text-sm text-white/60">Takes about 5 minutes.</p>
                  <Link to={`/jobs/${job.slug}/apply`} className="btn-primary btn-lg mt-4 w-full group">Apply Now <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
                  {job.application_close && <p className="mt-3 text-xs text-ink-500">Closes on {formatDate(job.application_close)}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
