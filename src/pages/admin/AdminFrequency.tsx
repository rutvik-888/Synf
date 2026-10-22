import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { FrequencyArticleRow, FrequencyCategoryRow } from '@/lib/platform-types';
import { ARTICLE_STATUS_LABELS } from '@/lib/platform-types';
import { useAuth } from '@/lib/auth';
import { Plus, Clock, Edit3, Trash2, Star, Pin, Search } from 'lucide-react';
import { formatDate, slugify } from '@/lib/format';

export function AdminFrequency() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<FrequencyArticleRow[]>([]);
  const [categories, setCategories] = useState<FrequencyCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase.from('frequency_articles').select('*, category:frequency_categories(*)').order('updated_at', { ascending: false }),
      supabase.from('frequency_categories').select('*').order('sort_order'),
    ]);
    setArticles((a as FrequencyArticleRow[]) || []);
    setCategories((c as FrequencyCategoryRow[]) || []);
    setLoading(false);
  }

  async function createArticle() {
    const title = 'Untitled Article';
    const { data } = await supabase.from('frequency_articles').insert({ title, slug: `${slugify(title)}-${Date.now()}`, status: 'draft', created_by: user?.id }).select('*').single();
    if (data) window.location.href = `/admin/frequency`;
  }

  async function toggleField(id: string, field: 'is_featured' | 'is_pinned', val: boolean) {
    await supabase.from('frequency_articles').update({ [field]: val }).eq('id', id);
    load();
  }

  async function deleteArticle(id: string) {
    if (!confirm('Delete this article?')) return;
    await supabase.from('frequency_articles').delete().eq('id', id);
    load();
  }

  async function setStatus(id: string, status: string) {
    const updates: Record<string, unknown> = { status };
    if (status === 'published') updates.published_at = new Date().toISOString();
    await supabase.from('frequency_articles').update(updates).eq('id', id);
    load();
  }

  const filtered = articles.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Frequency</h1>
          <p className="text-sm text-white/50">Manage magazine articles and editorial content.</p>
        </div>
        <button onClick={() => createArticle()} className="btn-primary"><Plus size={16} /> New article</button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input className="input pl-9" placeholder="Search articles…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-white/5" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-white/50">No articles yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <div key={a.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-900">
                {a.cover_image_url ? <img src={a.cover_image_url} alt="" className="h-full w-full object-cover" /> : <Clock size={18} className="text-white/20" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{a.title}</h3>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-white/40">
                  {a.category && <span>{a.category.name}</span>}
                  {a.published_at && <span>{formatDate(a.published_at)}</span>}
                  <span>{ARTICLE_STATUS_LABELS[a.status as keyof typeof ARTICLE_STATUS_LABELS] || a.status}</span>
                </div>
              </div>
              <button onClick={() => toggleField(a.id, 'is_featured', !a.is_featured)} className={`grid h-8 w-8 place-items-center rounded-lg transition-all ${a.is_featured ? 'bg-gold-400/20 text-gold-400' : 'text-white/30 hover:text-white'}`}><Star size={14} /></button>
              <button onClick={() => toggleField(a.id, 'is_pinned', !a.is_pinned)} className={`grid h-8 w-8 place-items-center rounded-lg transition-all ${a.is_pinned ? 'bg-acid-400/20 text-acid-400' : 'text-white/30 hover:text-white'}`}><Pin size={14} /></button>
              <select value={a.status} onChange={e => setStatus(a.id, e.target.value)} className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-white/70">
                {Object.entries(ARTICLE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={() => deleteArticle(a.id)} className="grid h-8 w-8 place-items-center rounded-lg text-white/30 hover:text-synf-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
