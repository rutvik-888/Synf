import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Users, Search, Star, LayoutGrid, List, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { PersonRow, DepartmentRow } from '@/lib/types';
import { ROLE_COLORS, DEPARTMENT_GROUPS } from '@/lib/types';
import { slugify } from '@/lib/format';
import { MediaUploader } from '@/components/MediaUploader';

const STATUSES = ['draft', 'pending_review', 'approved', 'hidden', 'archived'];

type ViewMode = 'grid' | 'list';
type SortKey = 'name' | 'recent' | 'custom';

export function AdminPeople() {
  const { isStaff } = useAuth();
  const [items, setItems] = useState<PersonRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<PersonRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('grid');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isStaff) return;
    (async () => {
      const { data: deptData, error: deptErr } = await supabase.from('departments').select('*').order('sort_order');
      if (deptErr) console.error('departments load failed', deptErr);
      if (deptData) setDepartments(deptData as DepartmentRow[]);

      const { data: peopleData } = await supabase.from('people').select('*').order('sort_order');
      setItems((peopleData as PersonRow[]) || []);
      setLoading(false);
    })();
  }, [isStaff]);

  const deptName = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departments) map.set(d.id, d.name);
    return (id: string | null | undefined) => (id ? (map.get(id) || id) : '');
  }, [departments]);

  const groupedDepts = useMemo(
    () => DEPARTMENT_GROUPS
      .map(group => ({ group, items: departments.filter(d => d.group_label === group).sort((a, b) => a.sort_order - b.sort_order) }))
      .filter(g => g.items.length > 0),
    [departments],
  );

  const filtered = useMemo(() => {
    let r = items.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    if (roleFilter !== 'all') r = r.filter(p => (p.category || '') === roleFilter);
    if (statusFilter !== 'all') r = r.filter(p => p.status === statusFilter);
    if (sort === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'recent') r = [...r].sort((a, b) => (b.id).localeCompare(a.id));
    if (sort === 'custom') r = [...r].sort((a, b) => a.sort_order - b.sort_order);
    return r;
  }, [items, q, roleFilter, statusFilter, sort]);

  async function save(p: Partial<PersonRow>) {
    if (!p.name?.trim()) { setSaveError('Name is required.'); return; }
    setSaving(true);
    setSaveError(null);
    const { id, related_event_ids, ...editable } = p;
    const payload = {
      ...editable,
      slug: p.slug || slugify(p.name || ''),
    };
    try {
      if (!p.id) {
        const { data, error } = await supabase.from('people').insert(payload).select('*').single();
        if (error) { setSaveError(error.message); return; }
        if (data) { setItems(arr => [data as PersonRow, ...arr]); setSel(data as PersonRow); setSavedAt(Date.now()); }
      } else {
        const { data, error } = await supabase.from('people').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', p.id).select('*').single();
        if (error) { setSaveError(error.message); return; }
        setItems(arr => arr.map(x => x.id === p.id ? { ...(data as PersonRow) } : x));
        setSel(s => s && s.id === p.id ? { ...(data as PersonRow) } : s);
        setSavedAt(Date.now());
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unexpected error saving profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); return; }
    const list = [...filtered];
    const [moved] = list.splice(dragIdx, 1);
    if (!moved) { setDragIdx(null); return; }
    list.splice(targetIdx, 0, moved);
    const movedIds = new Set(list.map(p => p.id));
    setItems(arr => [...list, ...arr.filter(x => !movedIds.has(x.id))]);
    setSort('custom');
    setDragIdx(null);
    await Promise.all(list.map((p, i) =>
      supabase.from('people').update({ sort_order: i }).eq('id', p.id)
    ));
  }

  async function del(id: string) {
    if (!confirm('Remove this person profile?')) return;
    await supabase.from('people').delete().eq('id', id);
    setItems(arr => arr.filter(x => x.id !== id)); setSel(null);
  }

  if (!isStaff) return <div className="text-white/50">Staff access required.</div>;

  const isEditing = !!sel;
  const colors = ROLE_COLORS.admin;

  const newPerson = (): PersonRow => ({
    id: '', slug: '', name: '', role: '', category: null, secondary_category: null,
    bio: '', portrait_url: '', portrait_alt: '', instagram_url: '',
    featured: false, status: 'draft', sort_order: items.length, related_event_ids: [],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-3xl font-extrabold tracking-tight">The Collective</h1><p className="text-white/50">Public profiles shown on the website. Drag cards to reorder how they appear publicly.</p></div>
        <button onClick={() => setSel(newPerson())} className="btn-primary"><Plus size={16} /> Add person</button>
      </div>

      {/* Toolbar */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input className="input pl-9" placeholder="Search by name…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All categories</option>
          {groupedDepts.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="input w-auto" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
          <option value="name">Sort: Name A–Z</option>
          <option value="recent">Sort: Recently updated</option>
          <option value="custom">Sort: Custom order</option>
        </select>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 p-0.5">
          <button onClick={() => setView('grid')} className={`rounded p-1.5 ${view === 'grid' ? 'bg-synf-500/20 text-synf-300' : 'text-ink-500 hover:text-white'}`}><LayoutGrid size={16} /></button>
          <button onClick={() => setView('list')} className={`rounded p-1.5 ${view === 'list' ? 'bg-synf-500/20 text-synf-300' : 'text-ink-500 hover:text-white'}`}><List size={16} /></button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* People display */}
        <div>
          {loading ? (
            <div className="card p-8 text-center text-ink-500">Loading directory…</div>
          ) : filtered.length === 0 ? (
            <div className="card p-10 text-center"><Users className="mx-auto h-10 w-10 text-ink-600" /><p className="mt-3 text-sm text-ink-500">No profiles match your filters.</p></div>
          ) : view === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p, i) => {
                const catLabel = deptName(p.category);
                const secLabel = deptName(p.secondary_category);
                return (
                  <button key={p.id} draggable onDragStart={() => setDragIdx(i)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(i)} onDragEnd={() => setDragIdx(null)} onClick={() => setSel(p)} className={`card group relative cursor-grab overflow-hidden p-5 text-left transition hover:scale-[1.02] hover:border-synf-500/40 ${dragIdx === i ? 'opacity-40' : ''}`}>
                    {p.featured && <Star size={14} className="absolute right-3 top-3 fill-gold-400 text-gold-400" />}
                    <div className="flex items-center gap-3">
                      {p.portrait_url ? (
                        <img src={p.portrait_url} alt={p.portrait_alt || p.name} className={`h-14 w-14 rounded-full border-2 object-cover ${colors.border}`} />
                      ) : (
                        <div className={`grid h-14 w-14 place-items-center rounded-full border-2 ${colors.bg} ${colors.border} ${colors.text} font-display text-lg font-extrabold`}>{p.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-lg font-extrabold">{p.name}</h3>
                        <p className={`truncate text-xs ${colors.text}`}>{p.role || catLabel}</p>
                      </div>
                    </div>
                    {p.bio && <p className="mt-3 line-clamp-2 text-xs text-white/50">{p.bio}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {catLabel && <span className="chip border border-synf-500/30 bg-synf-500/10 text-synf-300">{catLabel}</span>}
                      {secLabel && <span className="chip border border-white/10 bg-white/5 text-white/60">{secLabel}</span>}
                      <span className={`chip border ${p.status === 'approved' ? 'border-acid-400/30 bg-acid-400/15 text-acid-400' : 'border-white/10 text-white/50'}`}>{p.status.replace('_', ' ')}</span>
                      {p.instagram_url && <span className="chip border border-white/10 text-white/40">IG</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="card divide-y divide-white/5 overflow-hidden">
              {filtered.map((p, i) => {
                const catLabel = deptName(p.category);
                const secLabel = deptName(p.secondary_category);
                return (
                  <button key={p.id} draggable onDragStart={() => setDragIdx(i)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(i)} onDragEnd={() => setDragIdx(null)} onClick={() => setSel(p)} className={`flex w-full cursor-grab items-center gap-4 p-3 text-left hover:bg-white/5 ${sel?.id === p.id ? 'bg-synf-500/10' : ''} ${dragIdx === i ? 'opacity-40' : ''}`}>
                    <GripVertical size={14} className="shrink-0 text-ink-600" />
                    {p.portrait_url ? (
                      <img src={p.portrait_url} alt={p.portrait_alt || p.name} className={`h-10 w-10 rounded-full border-2 object-cover ${colors.border}`} />
                    ) : (
                      <div className={`grid h-10 w-10 place-items-center rounded-full border-2 ${colors.bg} ${colors.border} ${colors.text} text-sm font-bold`}>{p.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
                    )}
                    <div className="min-w-0 flex-1"><div className="font-semibold">{p.name}</div><div className={`text-xs ${colors.text}`}>{p.role || catLabel}</div></div>
                    {p.featured && <Star size={12} className="fill-gold-400 text-gold-400" />}
                    {catLabel && <span className="chip hidden border border-synf-500/30 bg-synf-500/10 text-synf-300 sm:inline">{catLabel}</span>}
                    {secLabel && <span className="chip hidden border border-white/10 bg-white/5 text-white/60 sm:inline">{secLabel}</span>}
                    <span className={`chip border ${p.status === 'approved' ? 'border-acid-400/30 bg-acid-400/15 text-acid-400' : 'border-white/10 text-white/50'}`}>{p.status.replace('_',' ')}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit panel */}
        {isEditing && sel && (
          <div className="card space-y-3 p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-extrabold">{sel.id ? 'Edit' : 'New'} profile</h2>{sel.id && <button onClick={() => del(sel.id)} className="btn-ghost text-synf-400"><Trash2 size={14} /></button>}</div>
            <div><label className="label">Name *</label><input className="input" value={sel.name} onChange={e => setSel({ ...sel, name: e.target.value, slug: sel.id ? sel.slug : slugify(e.target.value) })} /></div>
            <div><label className="label">Slug</label><input className="input" value={sel.slug} onChange={e => setSel({ ...sel, slug: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Role</label><input className="input" value={sel.role || ''} onChange={e => setSel({ ...sel, role: e.target.value })} /></div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={sel.category || ''} onChange={e => setSel({ ...sel, category: e.target.value || null })}>
                  <option value="">—</option>
                  {groupedDepts.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Second category (optional)</label>
              <select className="input" value={sel.secondary_category || ''} onChange={e => setSel({ ...sel, secondary_category: e.target.value || null })}>
                <option value="">—</option>
                {groupedDepts.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.filter(d => d.id !== sel.category).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-500">Add a second department this person also belongs to.</p>
            </div>
            <div><label className="label">Bio</label><textarea className="input min-h-[80px]" value={sel.bio || ''} onChange={e => setSel({ ...sel, bio: e.target.value })} /></div>
            <div>
              <label className="label mb-1.5 block">Portrait</label>
              <MediaUploader
                value={sel.portrait_url ? { url: sel.portrait_url, type: 'image', source_type: 'url', alt: sel.portrait_alt || null } : null}
                onChange={(val) => {
                  const item = Array.isArray(val) ? val[0] : val;
                  setSel({ ...sel, portrait_url: item?.url || '', portrait_alt: item?.alt || '' });
                }}
                multiple={false}
                accept={['image']}
                bucket="site-assets"
                pathPrefix="collective"
                maxFileSizeMB={5}
                label="Upload a portrait or paste a URL"
                aspectRatio="1/1"
                allowUrl
              />
            </div>
            <div><label className="label">Instagram URL</label><input className="input" value={sel.instagram_url || ''} onChange={e => setSel({ ...sel, instagram_url: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Status</label><select className="input" value={sel.status} onChange={e => setSel({ ...sel, status: e.target.value as PersonRow['status'] })}>{STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
              <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" className="accent-synf-500" checked={sel.featured} onChange={e => setSel({ ...sel, featured: e.target.checked })} /> Featured</label>
            </div>
            {saveError && <div className="rounded-lg border border-synf-500/40 bg-synf-500/10 px-3 py-2 text-sm text-synf-300">{saveError}</div>}
            {savedAt && !saveError && <div className="rounded-lg border border-acid-400/30 bg-acid-400/10 px-3 py-2 text-sm text-acid-400">Saved.</div>}
            <button onClick={() => save(sel)} disabled={saving || !sel.name.trim()} className="btn-primary w-full disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
