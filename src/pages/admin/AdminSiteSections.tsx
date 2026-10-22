import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { SiteSectionRow } from '@/lib/platform-types';
import { refreshSiteSections } from '@/lib/useSiteSections';
import { Eye, EyeOff, LayoutGrid, Check } from 'lucide-react';

export function AdminSiteSections() {
  const { user } = useAuth();
  const [sections, setSections] = useState<SiteSectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('site_sections').select('*').order('sort_order');
    setSections((data as SiteSectionRow[]) || []);
    setLoading(false);
  }

  async function toggle(id: string, key: string, val: boolean) {
    setSaving(id);
    await supabase.from('site_sections').update({ is_visible: val, updated_by: user?.id, updated_at: new Date().toISOString() }).eq('id', id);
    refreshSiteSections();
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1500);
    setSaving(null);
    load();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Site Sections</h1>
        <p className="text-sm text-white/50">Show or hide entire sections of the public website. Hidden sections disappear from navigation and become inaccessible. No data is deleted.</p>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(s => (
            <div key={s.id} className={`rounded-xl border p-5 transition-all ${s.is_visible ? 'border-acid-400/20 bg-acid-400/5' : 'border-white/10 bg-white/[0.03] opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.is_visible ? 'bg-acid-400/15 text-acid-400' : 'bg-white/5 text-white/30'}`}>
                    {s.is_visible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{s.label}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">/{s.key.replace('_', '-')}</p>
                  </div>
                </div>
                {savedKey === s.key && <Check size={16} className="text-acid-400 animate-fade-in" />}
              </div>
              <button
                onClick={() => toggle(s.id, s.key, !s.is_visible)}
                disabled={saving === s.id}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${s.is_visible
                  ? 'border border-white/10 text-white/60 hover:border-synf-500/40 hover:text-synf-400'
                  : 'bg-acid-400/15 text-acid-400 hover:bg-acid-400/25'
                }`}
              >
                {saving === s.id ? 'Saving…' : s.is_visible ? <><EyeOff size={14} /> Hide section</> : <><Eye size={14} /> Show section</>}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2 text-sm text-white/50">
          <LayoutGrid size={16} className="text-synf-400" />
          Hidden sections are removed from the navigation bar and footer. Direct links to hidden sections will also be blocked. Toggling a section back on restores it immediately — all content is preserved.
        </div>
      </div>
    </div>
  );
}
