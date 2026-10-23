import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CommunityWallPostRow, CommunityWallCategoryRow } from '@/lib/platform-types';
import { WALL_STATUS_LABELS } from '@/lib/platform-types';
import { Camera, Check, X, Trash2, Star, Search, Edit3, Save, Plus, Tag, ShieldCheck, Users } from 'lucide-react';
import { formatDate } from '@/lib/format';

type Tab = 'posts' | 'categories' | 'trusted';

export function AdminCommunity() {
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<CommunityWallPostRow[]>([]);
  const [categories, setCategories] = useState<CommunityWallCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editingPost, setEditingPost] = useState<CommunityWallPostRow | null>(null);

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

  async function savePostEdit() {
    if (!editingPost) return;
    await supabase.from('community_wall_posts').update({
      caption: editingPost.caption,
      category_id: editingPost.category_id,
    }).eq('id', editingPost.id);
    setEditingPost(null);
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
        <p className="text-sm text-white/50">Moderate community submissions, manage categories, and trusted contributors.</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-white/5">
        {[
          { key: 'posts' as Tab, label: 'Posts', icon: Camera, badge: pendingCount },
          { key: 'categories' as Tab, label: 'Categories', icon: Tag },
          { key: 'trusted' as Tab, label: 'Trusted Contributors', icon: ShieldCheck },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium transition ${tab === t.key ? 'border-b-2 border-synf-500 text-synf-400' : 'text-white/50 hover:text-white'}`}>
              <Icon size={14} /> {t.label}
              {t.badge ? <span className="ml-1 rounded-full bg-synf-500/20 px-1.5 py-0.5 text-[10px] font-bold text-synf-300">{t.badge}</span> : null}
            </button>
          );
        })}
      </div>

      {tab === 'posts' && (
        <>
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
                    {editingPost?.id === p.id ? (
                      <div className="space-y-2">
                        <textarea className="input min-h-[60px] text-sm" value={editingPost.caption || ''} onChange={e => setEditingPost({ ...editingPost, caption: e.target.value })} placeholder="Caption" />
                        <select className="input text-sm" value={editingPost.category_id || ''} onChange={e => setEditingPost({ ...editingPost, category_id: e.target.value || null })}>
                          <option value="">No category</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={savePostEdit} className="btn-primary py-1.5 text-xs"><Save size={12} /> Save</button>
                          <button onClick={() => setEditingPost(null)} className="btn-ghost py-1.5 text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {p.caption && <p className="text-sm text-white/70">{p.caption}</p>}
                        <div className="mt-2 text-xs text-white/35">
                          {p.contributor_name && !p.is_anonymous && <span>By {p.contributor_name}</span>}
                          {p.is_anonymous && <span>Anonymous</span>}
                          <span className="ml-2">{formatDate(p.created_at)}</span>
                          {p.category_id && categories.find(c => c.id === p.category_id) && (
                            <span className="ml-2 chip border border-white/10 text-[9px] text-white/40">{categories.find(c => c.id === p.category_id)!.name}</span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          {p.status === 'pending' && (
                            <>
                              <button onClick={() => setStatus(p.id, 'approved')} className="flex items-center gap-1 rounded-lg bg-acid-400/15 px-3 py-1.5 text-xs text-acid-400 hover:bg-acid-400/25"><Check size={12} /> Approve</button>
                              <button onClick={() => setStatus(p.id, 'rejected')} className="flex items-center gap-1 rounded-lg bg-synf-500/15 px-3 py-1.5 text-xs text-synf-400 hover:bg-synf-500/25"><X size={12} /> Reject</button>
                            </>
                          )}
                          <button onClick={() => toggleFeatured(p.id, !p.is_featured)} className={`grid h-7 w-7 place-items-center rounded-lg ${p.is_featured ? 'bg-gold-400/20 text-gold-400' : 'text-white/30 hover:text-white'}`}><Star size={12} /></button>
                          <button onClick={() => setEditingPost(p)} className="grid h-7 w-7 place-items-center rounded-lg text-white/30 hover:text-synf-400"><Edit3 size={12} /></button>
                          <button onClick={() => deletePost(p.id)} className="grid h-7 w-7 place-items-center rounded-lg text-white/30 hover:text-synf-400"><Trash2 size={12} /></button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'categories' && <CategoryManager categories={categories} onChanged={load} />}
      {tab === 'trusted' && <TrustedContributorsManager />}
    </div>
  );
}

function CategoryManager({ categories, onChanged }: { categories: CommunityWallCategoryRow[]; onChanged: () => void }) {
  const [newCat, setNewCat] = useState({ name: '', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  async function addCategory() {
    if (!newCat.name.trim()) return;
    setSaving(true);
    await supabase.from('community_wall_categories').insert({
      name: newCat.name.trim(),
      slug: newCat.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
      sort_order: newCat.sort_order || categories.length + 1,
      is_active: true,
    });
    setNewCat({ name: '', sort_order: 0 });
    setSaving(false);
    onChanged();
  }

  async function updateCategory(id: string, field: string, value: unknown) {
    await supabase.from('community_wall_categories').update({ [field]: value }).eq('id', id);
    onChanged();
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category? Existing posts will keep their reference.')) return;
    await supabase.from('community_wall_categories').delete().eq('id', id);
    onChanged();
  }

  async function moveCategory(id: string, dir: -1 | 1) {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(c => c.id === id);
    if (idx < 0 || (dir === -1 && idx === 0) || (dir === 1 && idx === sorted.length - 1)) return;
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from('community_wall_categories').update({ sort_order: swap.sort_order }).eq('id', id),
      supabase.from('community_wall_categories').update({ sort_order: sorted[idx].sort_order }).eq('id', swap.id),
    ]);
    onChanged();
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-4">
        <h3 className="font-display text-sm font-bold">Add New Category</h3>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Category name" value={newCat.name} onChange={e => setNewCat(f => ({ ...f, name: e.target.value }))} />
          <button onClick={addCategory} disabled={saving} className="btn-primary"><Plus size={14} /> Add</button>
        </div>
      </div>

      <div className="card divide-y divide-white/5 overflow-hidden">
        {[...categories].sort((a, b) => a.sort_order - b.sort_order).map((cat, i, arr) => (
          <div key={cat.id} className="flex items-center gap-3 p-3">
            <div className="flex-1 grid gap-2 sm:grid-cols-2">
              <input className="input text-sm" value={cat.name} onChange={e => updateCategory(cat.id, 'name', e.target.value)} />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-white/60">
                  <input type="checkbox" checked={cat.is_active} onChange={e => updateCategory(cat.id, 'is_active', e.target.checked)} className="accent-synf-500" /> Active
                </label>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => moveCategory(cat.id, -1)} disabled={i === 0} className="rounded p-1 text-white/40 hover:text-white disabled:opacity-20">↑</button>
              <button onClick={() => moveCategory(cat.id, 1)} disabled={i === arr.length - 1} className="rounded p-1 text-white/40 hover:text-white disabled:opacity-20">↓</button>
              <button onClick={() => deleteCategory(cat.id)} className="rounded p-1 text-synf-400 hover:bg-synf-500/10"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {categories.length === 0 && <div className="p-8 text-center text-sm text-white/40">No categories yet.</div>}
      </div>
    </div>
  );
}

function TrustedContributorsManager() {
  const [trusted, setTrusted] = useState<{ id: string; contributor_email: string; approved_count: number; is_trusted: boolean; trusted_at: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('community_wall_trusted_contributors').select('*').order('updated_at', { ascending: false });
      setTrusted((data as typeof trusted) || []);
      setLoading(false);
    })();
  }, []);

  async function toggleTrust(id: string, current: boolean) {
    await supabase.from('community_wall_trusted_contributors').update({
      is_trusted: !current,
      trusted_at: !current ? new Date().toISOString() : null,
    }).eq('id', id);
    setTrusted(arr => arr.map(t => t.id === id ? { ...t, is_trusted: !current, trusted_at: !current ? new Date().toISOString() : null } : t));
  }

  async function addManual() {
    if (!newEmail.trim()) return;
    const { data, error } = await supabase.from('community_wall_trusted_contributors').insert({
      contributor_email: newEmail.trim().toLowerCase(),
      is_trusted: true,
      trusted_at: new Date().toISOString(),
    }).select('*').single();
    if (!error && data) {
      setTrusted(arr => [data as typeof trusted[0], ...arr]);
      setNewEmail('');
    }
  }

  async function removeTrusted(id: string) {
    if (!confirm('Remove this trusted contributor?')) return;
    await supabase.from('community_wall_trusted_contributors').delete().eq('id', id);
    setTrusted(arr => arr.filter(t => t.id !== id));
  }

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={16} className="text-synf-400" />
          <h3 className="font-display text-sm font-bold">Auto-Approve Trusted Contributors</h3>
        </div>
        <p className="mb-4 text-sm text-white/50">When a contributor is marked as trusted, their future community wall submissions are automatically approved. Contributors earn trusted status after 3+ approved posts, or you can manually add them below.</p>

        <div className="flex gap-2 mb-4">
          <input className="input flex-1" placeholder="contributor@email.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <button onClick={addManual} className="btn-primary"><Plus size={14} /> Add as trusted</button>
        </div>
      </div>

      {loading ? <div className="h-32 animate-pulse rounded-xl bg-white/5" /> : (
        <div className="card divide-y divide-white/5 overflow-hidden">
          {trusted.length === 0 ? (
            <div className="flex flex-col items-center p-10 text-center">
              <Users className="h-8 w-8 text-white/20" />
              <p className="mt-3 text-sm text-white/50">No trusted contributors yet.</p>
            </div>
          ) : trusted.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{t.contributor_email}</div>
                <div className="text-xs text-white/40">{t.approved_count} approved posts{t.trusted_at && ` · trusted since ${formatDate(t.trusted_at)}`}</div>
              </div>
              <button onClick={() => toggleTrust(t.id, t.is_trusted)} className={`chip border text-xs ${t.is_trusted ? 'border-acid-400/30 bg-acid-400/15 text-acid-400' : 'border-white/10 text-white/50'}`}>
                {t.is_trusted ? 'Trusted' : 'Not trusted'}
              </button>
              <button onClick={() => removeTrusted(t.id)} className="rounded p-1 text-synf-400 hover:bg-synf-500/10"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
