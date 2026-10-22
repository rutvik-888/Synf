import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { EventRow } from '@/lib/types';
import { formatDate } from '@/lib/format';

export function AdminEvents() {
  const { isStaff } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStaff) return;
    (async () => {
      const { data } = await supabase.from('events').select('*').order('updated_at', { ascending: false });
      setEvents((data as EventRow[]) || []);
      setLoading(false);
    })();
  }, [isStaff]);

  const filtered = events.filter(e => e.title.toLowerCase().includes(q.toLowerCase()) || e.slug.includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-3xl font-extrabold tracking-tight">Events</h1><p className="text-white/50">Create, edit and publish events.</p></div>
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
              <tr><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3 hidden sm:table-cell">Date</th><th className="p-3 hidden md:table-cell">Published</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="p-3 font-semibold">{e.title}</td>
                  <td className="p-3"><span className="chip border border-white/10 text-white/70">{e.status.replace('_',' ')}</span></td>
                  <td className="p-3 hidden sm:table-cell text-white/60">{formatDate(e.start_at)}</td>
                  <td className="p-3 hidden md:table-cell">{e.is_published ? <span className="text-acid-400">Yes</span> : <span className="text-ink-500">Draft</span>}</td>
                  <td className="p-3 text-right"><Link to={`/admin/events/${e.id}`} className="text-synf-400 hover:underline">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
