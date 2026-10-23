import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { EventRow } from '@/lib/types';
import { formatDate, slugify } from '@/lib/format';

export function AdminEvents() {
  const { isStaff } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    (async () => {
      const { data } = await supabase.from('events').select('*').order('updated_at', { ascending: false });
      setEvents((data as EventRow[]) || []);
      setLoading(false);
    })();
  }, [isStaff]);

  const filtered = events.filter(e => e.title.toLowerCase().includes(q.toLowerCase()) || e.slug.includes(q.toLowerCase()));

  async function duplicateEvent(e: EventRow) {
    setDuplicating(true);
    const { id: _id, created_at: _ca, updated_at: _ua, published_at: _pa, is_published: _ip, ...rest } = e;
    const dup = {
      ...rest,
      title: `${e.title} (Copy)`,
      slug: slugify(`${e.title}-copy-${Date.now().toString().slice(-4)}`),
      status: 'draft' as const,
      is_published: false,
      published_at: null,
    };
    const { data, error } = await supabase.from('events').insert(dup).select('id').single();
    setDuplicating(false);
    if (!error && data) navigate(`/admin/events/${(data as { id: string }).id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-3xl font-extrabold tracking-tight">Events</h1><p className="text-white/50">Create, edit, duplicate and publish events.</p></div>
        <Link to="/admin/events/new" className="btn-primary"><Plus size={16} /> New event</Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <input className="input pl-9" placeholder="Search events…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? <div className="h-48 animate-pulse rounded-xl bg-ink-900" /> : filtered.length === 0 ? (
        <div className="card p-10 text-center text-white/50">No events yet. <Link to="/admin/events/new" className="text-synf-400">Create your first event →</Link></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-xs uppercase tracking-widest text-ink-500">
              <tr><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3 hidden sm:table-cell">Date</th><th className="p-3 hidden md:table-cell">Published</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="p-3 font-semibold">{e.title}</td>
                  <td className="p-3"><span className="chip border border-white/10 text-white/70">{e.status.replace('_',' ')}</span></td>
                  <td className="p-3 hidden sm:table-cell text-white/60">{formatDate(e.start_at)}</td>
                  <td className="p-3 hidden md:table-cell">{e.is_published ? <span className="text-acid-400">Yes</span> : <span className="text-ink-500">Draft</span>}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => duplicateEvent(e)} disabled={duplicating} title="Duplicate event" className="text-white/40 hover:text-synf-400 transition-colors"><Copy size={14} /></button>
                      <Link to={`/admin/events/${e.id}`} className="text-synf-400 hover:underline">Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
