import { useEffect, useState } from 'react';
import { Plus, Briefcase, Search, ArrowRight, Pause, Play, Archive, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { JobPostingRow, JobStatus } from '@/lib/types';
import { JOB_STATUS_LABELS } from '@/lib/types';
import { formatDate } from '@/lib/format';

const STATUS_COLORS: Record<JobStatus, string> = {
  draft: 'text-ink-400 bg-ink-800',
  published: 'text-acid-400 bg-acid-400/10',
  paused: 'text-gold-400 bg-gold-400/10',
  closed: 'text-synf-400 bg-synf-400/10',
  archived: 'text-white/40 bg-white/5',
};

export function AdminJobs() {
  const { role } = useAuth();
  const canWrite = role === 'founder' || role === 'owner' || role === 'admin' || role === 'recruitment_manager';
  const [items, setItems] = useState<JobPostingRow[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('job_postings').select('*').order('created_at', { ascending: false });
      setItems((data as JobPostingRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter(j => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (q) {
      const s = `${j.title} ${j.department}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  async function changeStatus(id: string, status: JobStatus) {
    await supabase.from('job_postings').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setItems(arr => arr.map(j => j.id === id ? { ...j, status } : j));
  }

  async function del(id: string) {
    if (!confirm('Delete this job posting? This cannot be undone.')) return;
    await supabase.from('job_postings').delete().eq('id', id);
    setItems(arr => arr.filter(j => j.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Jobs & Recruitment</h1>
          <p className="text-white/50">Create and manage job postings. Published jobs appear on the public Join page.</p>
        </div>
        {canWrite && <Link to="/admin/jobs/new" className="btn-primary"><Plus size={16} /> New job</Link>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" /><input className="input pl-9" placeholder="Search jobs…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="input sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-ink-900" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center"><Briefcase className="mx-auto h-10 w-10 text-ink-500" /><p className="mt-3 text-white/50">No job postings yet.{canWrite && ' Create one to start recruiting.'}</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(j => (
            <div key={j.id} className="card flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <Link to={`/admin/jobs/${j.id}`} className="font-display text-lg font-extrabold hover:text-synf-400">{j.title}</Link>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${STATUS_COLORS[j.status]}`}>{JOB_STATUS_LABELS[j.status]}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/50">
                  <span>{j.department}</span>
                  <span>Opens: {formatDate(j.application_open)}</span>
                  {j.application_close && <span>Closes: {formatDate(j.application_close)}</span>}
                  {j.num_openings && <span>{j.num_openings} opening{j.num_openings > 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canWrite && j.status === 'published' && <button onClick={() => changeStatus(j.id, 'paused')} title="Pause" className="btn-ghost p-2"><Pause size={14} /></button>}
                {canWrite && j.status === 'paused' && <button onClick={() => changeStatus(j.id, 'published')} title="Resume" className="btn-ghost p-2"><Play size={14} /></button>}
                {canWrite && (j.status === 'published' || j.status === 'paused') && <button onClick={() => changeStatus(j.id, 'closed')} title="Close" className="btn-ghost p-2 text-synf-400"><Archive size={14} /></button>}
                {canWrite && (j.status === 'closed' || j.status === 'draft') && <button onClick={() => del(j.id)} title="Delete" className="btn-ghost p-2 text-synf-400"><Trash2 size={14} /></button>}
                <Link to={`/admin/jobs/${j.id}`} className="btn-ghost p-2"><ArrowRight size={14} /></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
