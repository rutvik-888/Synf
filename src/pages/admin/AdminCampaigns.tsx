import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CampaignRow } from '@/lib/platform-types';
import { CAMPAIGN_STATUS_LABELS } from '@/lib/platform-types';
import { useAuth } from '@/lib/auth';
import { Plus, Megaphone, Trash2, Search, ExternalLink } from 'lucide-react';
import { formatDate, slugify } from '@/lib/format';

export function AdminCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CampaignRow | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('campaigns').select('*').order('updated_at', { ascending: false });
    setCampaigns((data as CampaignRow[]) || []);
    setLoading(false);
  }

  async function createCampaign() {
    const name = 'Untitled Campaign';
    const { data } = await supabase.from('campaigns').insert({ name, slug: `${slugify(name)}-${Date.now()}`, status: 'draft', created_by: user?.id }).select('*').single();
    if (data) { setEditing(data as CampaignRow); load(); }
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign? Related events/articles will not be affected.')) return;
    await supabase.from('campaigns').delete().eq('id', id);
    load();
  }

  async function setStatus(id: string, status: string) {
    await supabase.from('campaigns').update({ status }).eq('id', id);
    load();
  }

  async function toggleLanding(id: string, val: boolean) {
    await supabase.from('campaigns').update({ landing_page_visible: val }).eq('id', id);
    load();
  }

  async function saveCampaign(updates: Partial<CampaignRow>) {
    if (!editing) return;
    await supabase.from('campaigns').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', editing.id);
    setEditing(null);
    load();
  }

  const filtered = campaigns.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Campaign Studio</h1>
          <p className="text-sm text-white/50">Coordinate event campaigns, drops and announcements.</p>
        </div>
        <button onClick={createCampaign} className="btn-primary"><Plus size={16} /> New campaign</button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input className="input pl-9" placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="h-48 animate-pulse rounded-xl bg-white/5" /> : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-white/50">No campaigns yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-900">
                {c.cover_image_url ? <img src={c.cover_image_url} alt="" className="h-full w-full object-cover" /> : <Megaphone size={18} className="text-white/20" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{c.name}</h3>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-white/40">
                  {c.start_date && <span>{formatDate(c.start_date)}</span>}
                  <span>{CAMPAIGN_STATUS_LABELS[c.status as keyof typeof CAMPAIGN_STATUS_LABELS] || c.status}</span>
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-white/50"><input type="checkbox" checked={c.landing_page_visible} onChange={e => toggleLanding(c.id, e.target.checked)} className="accent-synf-500" /> Landing</label>
              <select value={c.status} onChange={e => setStatus(c.id, e.target.value)} className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-white/70">
                {Object.entries(CAMPAIGN_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={() => setEditing(c)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white">Edit</button>
              {c.landing_page_visible && <a href={`/campaigns/${c.slug}`} target="_blank" rel="noopener noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-white/30 hover:text-synf-400"><ExternalLink size={14} /></a>}
              <button onClick={() => deleteCampaign(c.id)} className="grid h-8 w-8 place-items-center rounded-lg text-white/30 hover:text-synf-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {editing && <CampaignEditor campaign={editing} onSave={saveCampaign} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CampaignEditor({ campaign, onSave, onClose }: { campaign: CampaignRow; onSave: (u: Partial<CampaignRow>) => void; onClose: () => void }) {
  const [name, setName] = useState(campaign.name);
  const [headline, setHeadline] = useState(campaign.headline || '');
  const [subheadline, setSubheadline] = useState(campaign.subheadline || '');
  const [description, setDescription] = useState(campaign.description || '');
  const [ctaLabel, setCtaLabel] = useState(campaign.cta_label || '');
  const [ctaUrl, setCtaUrl] = useState(campaign.cta_url || '');
  const [coverUrl, setCoverUrl] = useState(campaign.cover_image_url || '');
  const [startDate, setStartDate] = useState(campaign.start_date?.slice(0, 16) || '');
  const [endDate, setEndDate] = useState(campaign.end_date?.slice(0, 16) || '');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-xl" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-ink-900 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="mb-6 font-display text-xl font-extrabold">Edit campaign</h2>
        <div className="space-y-4">
          <div><label className="label">Name</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="label">Headline</label><input className="input" value={headline} onChange={e => setHeadline(e.target.value)} /></div>
          <div><label className="label">Subheadline</label><input className="input" value={subheadline} onChange={e => setSubheadline(e.target.value)} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div><label className="label">Cover image URL</label><input className="input" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Start date</label><input className="input" type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div><label className="label">End date</label><input className="input" type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">CTA label</label><input className="input" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} /></div>
            <div><label className="label">CTA URL</label><input className="input" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} /></div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => onSave({ name, headline, subheadline, description, cta_label: ctaLabel, cta_url: ctaUrl, cover_image_url: coverUrl, start_date: startDate || null, end_date: endDate || null })} className="btn-primary">Save</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}
