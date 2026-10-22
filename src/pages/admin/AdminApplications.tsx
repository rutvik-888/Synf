import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserSquare, ArrowLeft, CheckCircle, Calendar, XCircle, Mail, Clock, RotateCcw, FileText, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ApplicationRow, ApplicationStatus, FormField, InterviewRow, ApplicationStatusHistoryRow, EmailLogRow, JobPostingRow } from '@/lib/types';
import { APPLICATION_STATUS_LABELS } from '@/lib/types';
import { applicationAction } from '@/lib/api';
import { formatDateTime, formatDate } from '@/lib/format';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  submitted: 'text-ink-300 bg-ink-800',
  under_review: 'text-gold-400 bg-gold-400/10',
  approved: 'text-acid-400 bg-acid-400/10',
  interview_invited: 'text-synf-300 bg-synf-500/15',
  rejected: 'text-synf-400 bg-synf-400/10',
  withdrawn: 'text-white/40 bg-white/5',
};

export function AdminApplications() {
  const { role } = useAuth();
  const canRead = role === 'founder' || role === 'owner' || role === 'admin' || role === 'recruitment_manager' || role === 'event_manager';
  const [items, setItems] = useState<(ApplicationRow & { job_title?: string })[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [jobs, setJobs] = useState<JobPostingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!canRead) return;
    (async () => {
      const { data: jobData } = await supabase.from('job_postings').select('id, title').order('title');
      setJobs((jobData as JobPostingRow[]) || []);

      const { data } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
      const apps = (data as ApplicationRow[]) || [];

      const jobMap = new Map((jobData as JobPostingRow[] || []).map(j => [j.id, j.title]));
      const enriched = apps.map(a => ({ ...a, job_title: a.job_id ? jobMap.get(a.job_id) || 'Unknown' : 'General' }));
      setItems(enriched);
      setLoading(false);

      const c: Record<string, number> = { submitted: 0, under_review: 0, approved: 0, interview_invited: 0, rejected: 0 };
      apps.forEach(a => { if (c[a.status] !== undefined) c[a.status]++; });
      setCounts(c);
    })();
  }, [canRead]);

  const filtered = items.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (jobFilter !== 'all' && a.job_id !== jobFilter) return false;
    if (q) {
      const s = `${a.full_name} ${a.email} ${a.application_code || ''} ${a.preferred_role || ''} ${(a as ApplicationRow & { job_title?: string }).job_title || ''}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  if (!canRead) return <div className="text-white/50">Recruitment access required.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Applications</h1>
        <p className="text-white/50">Recruitment inbox — every submission appears here automatically.</p>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { key: 'submitted', label: 'New', color: 'text-ink-300' },
          { key: 'under_review', label: 'Under Review', color: 'text-gold-400' },
          { key: 'interview_invited', label: 'Interview', color: 'text-synf-300' },
          { key: 'approved', label: 'Approved', color: 'text-acid-400' },
          { key: 'rejected', label: 'Rejected', color: 'text-synf-400' },
        ].map(c => (
          <div key={c.key} className="card p-4">
            <div className={`text-2xl font-extrabold ${c.color}`}>{counts[c.key] || 0}</div>
            <div className="mt-1 text-xs uppercase tracking-widest text-ink-500">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" /><input className="input pl-9" placeholder="Search by ID, name, email, job…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="input sm:w-48" value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
          <option value="all">All jobs</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select className="input sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All stages</option>
          {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-ink-900" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center"><UserSquare className="mx-auto h-10 w-10 text-ink-500" /><p className="mt-3 text-white/50">No applications match your filters.</p></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5 text-left text-xs uppercase tracking-widest text-ink-500">
              <th className="p-3">App ID</th><th className="p-3">Applicant</th><th className="p-3 hidden sm:table-cell">Job</th><th className="p-3 hidden md:table-cell">Submitted</th><th className="p-3">Status</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="p-3 font-mono text-xs text-synf-300">{a.application_code || '—'}</td>
                  <td className="p-3"><div className="font-semibold text-white">{a.full_name}</div><div className="text-xs text-white/50">{a.email}</div></td>
                  <td className="p-3 hidden sm:table-cell text-white/70">{(a as ApplicationRow & { job_title?: string }).job_title}</td>
                  <td className="p-3 hidden md:table-cell text-white/50">{formatDate(a.created_at)}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${STATUS_COLORS[a.status]}`}>{APPLICATION_STATUS_LABELS[a.status]}</span></td>
                  <td className="p-3"><Link to={`/admin/applications/${a.id}`} className="text-synf-400 hover:text-synf-300"><ExternalLink size={14} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
