import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { InsideStoryRow, InsideStoryTypeRow } from '@/lib/platform-types';
import { useAuth } from '@/lib/auth';
import { Plus, Users, Trash2, Star, Search } from 'lucide-react';
import { formatDate, slugify } from '@/lib/format';

export function AdminInsideSynf() {
  const { user } = useAuth();
  const [stories, setStories] = useState<InsideStoryRow[]>([]);
  const [types, setTypes] = useState<InsideStoryTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from('inside_stories').select('*, story_type:inside_story_types(*)').order('updated_at', { ascending: false }),
      supabase.from('inside_story_types').select('*').order('sort_order'),
    ]);
    setStories((s as InsideStoryRow[]) || []);
    setTypes((t as InsideStoryTypeRow[]) || []);
    setLoading(false);
  }

  async function createStory() {
    const title = 'Untitled Story';
    const { data } = await supabase.from('inside_stories').insert({ title, slug: `${slugify(title)}-${Date.now()}`, status: 'draft', created_by: user?.id }).select('*').single();
    if (data) load();
  }

  async function deleteStory(id: string) {
    if (!confirm('Delete this story?')) return;
    await supabase.from('inside_stories').delete().eq('id', id);
    load();
  }

  async function setStatus(id: string, status: string) {
    const updates: Record<string, unknown> = { status };
    if (status === 'published') updates.published_at = new Date().toISOString();
    await supabase.from('inside_stories').update(updates).eq('id', id);
    load();
  }

  async function toggleFeatured(id: string, val: boolean) {
    await supabase.from('inside_stories').update({ is_featured: val }).eq('id', id);
    load();
  }

  const filtered = stories.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Inside Synf</h1>
          <p className="text-sm text-white/50">Manage behind-the-scenes stories and team features.</p>
        </div>
        <button onClick={createStory} className="btn-primary"><Plus size={16} /> New story</button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input className="input pl-9" placeholder="Search stories…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="h-48 animate-pulse rounded-xl bg-white/5" /> : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-white/50">No stories yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <div key={s.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-900">
                {s.cover_image_url ? <img src={s.cover_image_url} alt="" className="h-full w-full object-cover" /> : <Users size={18} className="text-white/20" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{s.title}</h3>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-white/40">
                  {s.story_type && <span>{s.story_type.name}</span>}
                  {s.published_at && <span>{formatDate(s.published_at)}</span>}
                  <span className="capitalize">{s.status}</span>
                </div>
              </div>
              <button onClick={() => toggleFeatured(s.id, !s.is_featured)} className={`grid h-8 w-8 place-items-center rounded-lg ${s.is_featured ? 'bg-gold-400/20 text-gold-400' : 'text-white/30 hover:text-white'}`}><Star size={14} /></button>
              <select value={s.status} onChange={e => setStatus(s.id, e.target.value)} className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-white/70">
                <option value="draft">Draft</option><option value="in_review">In Review</option><option value="approved">Approved</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option>
              </select>
              <button onClick={() => deleteStory(s.id)} className="grid h-8 w-8 place-items-center rounded-lg text-white/30 hover:text-synf-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
