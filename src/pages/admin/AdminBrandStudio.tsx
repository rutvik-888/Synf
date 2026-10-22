import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BrandThemeRow } from '@/lib/platform-types';
import type { LaunchConfig } from '@/lib/launchConfig';
import { fetchLaunchConfig } from '@/lib/launchConfig';
import { Palette, Check, Sparkles, Rocket, Save, Eye, EyeOff } from 'lucide-react';

const DEFAULT_LAUNCH: LaunchConfig = {
  enabled: false,
  launch_date: null,
  headline: 'Something extraordinary is coming',
  subheadline: 'Team Synf — We don\u2019t do ordinary.',
  background_theme: 'synf',
  show_email_signup: true,
};

export function AdminBrandStudio() {
  const [themes, setThemes] = useState<BrandThemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [launch, setLaunch] = useState<LaunchConfig>(DEFAULT_LAUNCH);
  const [launchSaving, setLaunchSaving] = useState(false);
  const [launchSaved, setLaunchSaved] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('brand_themes').select('*').order('created_at');
    setThemes((data as BrandThemeRow[]) || []);
    const cfg = await fetchLaunchConfig();
    setLaunch(cfg);
    setLoading(false);
  }

  async function activateTheme(id: string) {
    setSaving(true);
    await supabase.from('brand_themes').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('brand_themes').update({ is_active: true }).eq('id', id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  const saveLaunch = useCallback(async () => {
    setLaunchSaving(true);
    await supabase.from('site_content').update({ data: launch as unknown as Record<string, unknown> }).eq('slug', 'launch_config');
    setLaunchSaving(false);
    setLaunchSaved(true);
    setTimeout(() => setLaunchSaved(false), 2500);
  }, [launch]);

  const activeTheme = themes.find(t => t.is_active);

  // Convert ISO string to datetime-local input value
  const toLocalInput = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
  };

  const fromLocalInput = (val: string): string | null => {
    if (!val) return null;
    return new Date(val).toISOString();
  };

  const launchActive = launch.enabled && launch.launch_date && new Date(launch.launch_date).getTime() > Date.now();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Brand Studio</h1>
        <p className="text-sm text-white/50">Configure the site's visual identity, intro experience, and launch countdown.</p>
      </div>

      {/* Launch Mode */}
      <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Rocket size={18} className="text-synf-400" /> Launch Countdown</h2>
          {launchActive && <span className="chip border border-synf-500/30 bg-synf-500/15 text-[10px] text-synf-300">Live countdown active</span>}
        </div>
        <p className="mt-1 text-sm text-white/50">Show a "coming soon" countdown page that gates the public website. The site automatically goes live when the timer reaches zero.</p>

        <div className="mt-5 space-y-4">
          {/* Enable toggle */}
          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-900/50 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Enable launch mode</div>
              <div className="text-xs text-white/40">When on, visitors see the countdown instead of the website</div>
            </div>
            <button
              onClick={() => setLaunch(v => ({ ...v, enabled: !v.enabled }))}
              className={`relative h-7 w-12 rounded-full transition-colors ${launch.enabled ? 'bg-synf-500' : 'bg-white/15'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${launch.enabled ? 'left-6' : 'left-1'}`} />
            </button>
          </label>

          {/* Launch date/time */}
          <div>
            <label className="label">Launch date &amp; time</label>
            <input
              type="datetime-local"
              value={toLocalInput(launch.launch_date)}
              onChange={e => setLaunch(v => ({ ...v, launch_date: fromLocalInput(e.target.value) }))}
              className="input"
            />
            <p className="mt-1.5 text-xs text-white/40">Set the exact moment the site goes live. The countdown shows days, hours, minutes, and seconds.</p>
          </div>

          {/* Headline */}
          <div>
            <label className="label">Headline</label>
            <input
              type="text"
              value={launch.headline}
              onChange={e => setLaunch(v => ({ ...v, headline: e.target.value }))}
              className="input"
              placeholder="Something extraordinary is coming"
            />
          </div>

          {/* Subheadline */}
          <div>
            <label className="label">Subheadline</label>
            <input
              type="text"
              value={launch.subheadline}
              onChange={e => setLaunch(v => ({ ...v, subheadline: e.target.value }))}
              className="input"
              placeholder="Team Synf — We don't do ordinary."
            />
          </div>

          {/* Email signup toggle */}
          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-900/50 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Email waitlist</div>
              <div className="text-xs text-white/40">Let visitors sign up to be notified when the site launches</div>
            </div>
            <button
              onClick={() => setLaunch(v => ({ ...v, show_email_signup: !v.show_email_signup }))}
              className={`relative h-7 w-12 rounded-full transition-colors ${launch.show_email_signup ? 'bg-synf-500' : 'bg-white/15'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${launch.show_email_signup ? 'left-6' : 'left-1'}`} />
            </button>
          </label>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={saveLaunch}
              disabled={launchSaving}
              className="btn-primary"
            >
              {launchSaving ? 'Saving…' : <><Save size={16} /> Save launch settings</>}
            </button>
            {launchSaved && <span className="flex items-center gap-1.5 text-sm text-acid-400 animate-fade-in"><Check size={16} /> Saved</span>}
          </div>
        </div>
      </div>

      {/* Theme selection */}
      {activeTheme && (
        <div className="mb-6 rounded-xl border border-synf-500/30 bg-synf-500/10 p-4">
          <div className="flex items-center gap-2 text-sm text-synf-300"><Check size={16} /> Active theme: <strong>{activeTheme.name}</strong></div>
        </div>
      )}

      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Palette size={18} /> Campaign Themes</h2>

      {loading ? <div className="h-48 animate-pulse rounded-xl bg-white/5" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map(t => {
            const cfg = t.config as Record<string, string>;
            return (
              <div key={t.id} className={`overflow-hidden rounded-2xl border-2 transition-all ${t.is_active ? 'border-synf-500' : 'border-white/10 hover:border-white/20'}`}>
                <div className="h-24" style={{ background: `linear-gradient(135deg, ${cfg.primaryColor || '#ff2d6f'}, ${cfg.accentColor || '#d4ff3f'})` }} />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold">{t.name}</h3>
                    {t.is_system && <span className="chip border border-white/10 text-[10px] text-white/40">System</span>}
                  </div>
                  {t.description && <p className="mt-1 text-xs text-white/50">{t.description}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    {cfg.primaryColor && <span className="h-5 w-5 rounded-full border border-white/20" style={{ background: cfg.primaryColor }} />}
                    {cfg.accentColor && <span className="h-5 w-5 rounded-full border border-white/20" style={{ background: cfg.accentColor }} />}
                    {cfg.bgColor && <span className="h-5 w-5 rounded-full border border-white/20" style={{ background: cfg.bgColor }} />}
                  </div>
                  <button onClick={() => activateTheme(t.id)} disabled={t.is_active || saving} className={`mt-4 w-full rounded-lg py-2 text-sm font-medium transition-all ${t.is_active ? 'bg-acid-400/15 text-acid-400' : 'border border-white/10 text-white/70 hover:border-synf-500/40 hover:text-white'}`}>
                    {t.is_active ? <span className="flex items-center justify-center gap-1"><Check size={14} /> Active</span> : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Sparkles size={18} /> Homepage Configuration</h2>
        <p className="text-sm text-white/50">Homepage hero text and ticker content are managed in <a href="/admin/content" className="text-synf-400 underline">Content settings</a>. Theme colors and motion settings are controlled by the active campaign theme above.</p>
      </div>
    </div>
  );
}
