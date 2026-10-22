import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { SecretDropRow } from '@/lib/platform-types';
import { useAuth } from '@/lib/auth';
import { Plus, Lock, Trash2, Eye, Search } from 'lucide-react';
import { formatDate, slugify, countdown } from '@/lib/format';

export function AdminDrops() {
  const { user } = useAuth();
  const [drops, setDrops] = useState<SecretDropRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('secret_drops').select('*').order('updated_at', { ascending: false });
    setDrops((data as SecretDropRow[]) || []);
    setLoading(false);
  }

  async function createDrop() {
    const title = 'Untitled Drop';
    const { data } = await supabase.from('secret_drops').insert({ title, slug: `${slugify(title)}-${Date.now()}`, status: 'draft', is_visible: false, created_by: user?.id }).select('*').single();
    if (data) load();
  }

  async function deleteDrop(id: string) {
    if (!confirm('Delete this drop?')) return;
    await supabase.from('secret_drops').delete().eq('id', id);
    load();
  }

  async function setVisible(id: string, val: boolean) {
    await supabase.from('secret_drops').update({ is_visible: val }).eq('id', id);
    load();
  }

  async function setStatus(id: string, status: string) {
    await supabase.from('secret_drops').update({ status }).eq('id', id);
    load();
  }

  const filtered = drops.filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Secret Drops</h1>
          <p className="text-sm text-white/50">Manage staged announcements and mystery reveals.</p>
        </div>
        <button onClick={createDrop} className="btn-primary"><Plus size={16} /> New drop</button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input className="input pl-9" placeholder="Search drops…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="h-48 animate-pulse rounded-xl bg-white/5" /> : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Lock className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-white/50">No drops yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => {
            const cd = d.reveal_at ? countdown(d.reveal_at) : null;
            return (
              <div key={d.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-900">
                  {d.poster_url ? <img src={d.poster_url} alt="" className="h-full w-full object-cover" /> : <Lock size={18} className="text-white/20" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{d.title}</h3>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-white/40">
                    {d.reveal_at && <span>Reveals {formatDate(d.reveal_at)}</span>}
                    {cd && !cd.past && <span className="text-synf-400">{cd.days}d {cd.hours}h left</span>}
                    <span className="capitalize">{d.status}</span>
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-white/50"><input type="checkbox" checked={d.is_visible} onChange={e => setVisible(d.id, e.target.checked)} className="accent-synf-500" /> Visible</label>
                <select value={d.status} onChange={e => setStatus(d.id, e.target.value)} className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-white/70">
                  <option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="archived">Archived</option>
                </select>
                <button onClick={() => deleteDrop(d.id)} className="grid h-8 w-8 place-items-center rounded-lg text-white/30 hover:text-synf-400"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
