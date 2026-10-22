import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CommunityWallPostRow, CommunityWallCategoryRow } from '@/lib/platform-types';
import { WALL_STATUS_LABELS } from '@/lib/platform-types';
import { Camera, Check, X, Trash2, Star, Search } from 'lucide-react';
import { formatDate } from '@/lib/format';

export function AdminCommunity() {
  const [posts, setPosts] = useState<CommunityWallPostRow[]>([]);
  const [categories, setCategories] = useState<CommunityWallCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('community_wall_posts').select('*, category:community_wall_categories(*)').order('created_at', { ascending: false }),
      supabase.from('community_wall_categories').select('*').order('sort_order'),
    ]);
    setPosts((p as CommunityWallPostRow[]) || []);
    setCategories((c as CommunityWallCategoryRow[]) || []);
    setLoading(false);
  }

  async function setStatus(id: string, status: string) {
    await supabase.from('community_wall_posts').update({ status, moderated_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  async function toggleFeatured(id: string, val: boolean) {
    await supabase.from('community_wall_posts').update({ is_featured: val }).eq('id', id);
    load();
  }

  async function deletePost(id: string) {
    if (!confirm('Remove this post permanently?')) return;
    await supabase.from('community_wall_posts').delete().eq('id', id);
    load();
  }

  const filtered = posts.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !(p.caption || '').toLowerCase().includes(search.toLowerCase()) && !(p.contributor_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingCount = posts.filter(p => p.status === 'pending').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Community Wall</h1>
        <p className="text-sm text-white/50">Moderate community submissions. {pendingCount > 0 && <span className="text-gold-400">{pendingCount} pending review</span>}</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'approved', 'rejected', 'archived'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`chip border transition-all ${filter === f ? 'border-synf-500/40 bg-synf-500/20 text-synf-300' : 'border-white/10 bg-ink-900 text-white/60 hover:text-white'}`}>
              {f === 'all' ? 'All' : WALL_STATUS_LABELS[f as keyof typeof WALL_STATUS_LABELS] || f}
              {f === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input className="input pl-9" placeholder="Search posts…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="h-48 animate-pulse rounded-xl bg-white/5" /> : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Camera className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-white/50">No posts to show.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <div className="relative aspect-video overflow-hidden">
                {p.media_type === 'video' ? (
                  <div className="flex h-full w-full items-center justify-center bg-ink-900"><Camera size={24} className="text-white/20" /></div>
                ) : (
                  <img src={p.media_url} alt={p.caption || ''} className="h-full w-full object-cover" />
                )}
                <span className={`absolute left-2 top-2 chip border text-[10px] backdrop-blur-sm ${p.status === 'approved' ? 'border-acid-400/40 bg-acid-400/20 text-acid-400' : p.status === 'pending' ? 'border-gold-400/40 bg-gold-400/20 text-gold-400' : 'border-white/10 bg-ink-950/80 text-white/50'}`}>
                  {WALL_STATUS_LABELS[p.status as keyof typeof WALL_STATUS_LABELS] || p.status}
                </span>
              </div>
              <div className="p-4">
                {p.caption && <p className="text-sm text-white/70">{p.caption}</p>}
                <div className="mt-2 text-xs text-white/35">
                  {p.contributor_name && !p.is_anonymous && <span>By {p.contributor_name}</span>}
                  {p.is_anonymous && <span>Anonymous</span>}
                  <span className="ml-2">{formatDate(p.created_at)}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {p.status === 'pending' && (
                    <>
                      <button onClick={() => setStatus(p.id, 'approved')} className="flex items-center gap-1 rounded-lg bg-acid-400/15 px-3 py-1.5 text-xs text-acid-400 hover:bg-acid-400/25"><Check size={12} /> Approve</button>
                      <button onClick={() => setStatus(p.id, 'rejected')} className="flex items-center gap-1 rounded-lg bg-synf-500/15 px-3 py-1.5 text-xs text-synf-400 hover:bg-synf-500/25"><X size={12} /> Reject</button>
                    </>
                  )}
                  <button onClick={() => toggleFeatured(p.id, !p.is_featured)} className={`grid h-7 w-7 place-items-center rounded-lg ${p.is_featured ? 'bg-gold-400/20 text-gold-400' : 'text-white/30 hover:text-white'}`}><Star size={12} /></button>
                  <button onClick={() => deletePost(p.id)} className="grid h-7 w-7 place-items-center rounded-lg text-white/30 hover:text-synf-400"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
