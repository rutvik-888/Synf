import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { SiteContentRow, RecruitmentFormRow, FormField } from '@/lib/types';
import { applyFavicon } from '@/lib/favicon';
import { Save, Plus, Trash2, FileText, Upload, Image as ImageIcon, Check, MessageSquare, Sparkles } from 'lucide-react';
import { FormBuilder } from '@/components/FormBuilder';

const PAGES = [
  { slug: 'home_hero', title: 'Homepage hero', desc: 'Headline & subhead on the homepage.' },
  { slug: 'about', title: 'About page', desc: 'Main body text.' },
  { slug: 'terms', title: 'Terms', desc: 'Legal terms text.' },
  { slug: 'privacy', title: 'Privacy', desc: 'Privacy policy text.' },
  { slug: 'copyright', title: 'Copyright', desc: 'Copyright notice text.' },
];

const FIELD_TYPES: { value: FormField['type']; label: string }[] = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
];

export function AdminContent() {
  const { isAdminOrOwner } = useAuth();
  const [slug, setSlug] = useState('home_hero');
  const [content, setContent] = useState<SiteContentRow | null>(null);
  const [body, setBody] = useState('');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Branding / favicon
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [favUploading, setFavUploading] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);

  // Recruitment form
  const [rf, setRf] = useState<RecruitmentFormRow | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [rfMeta, setRfMeta] = useState({ title: '', intro: '', consent_text: '' });

  useEffect(() => {
    if (!isAdminOrOwner) return;
    (async () => {
      const { data: d } = await supabase.from('site_content').select('*').eq('slug', slug).maybeSingle();
      setContent(d as SiteContentRow | null);
      setBody((d as SiteContentRow)?.body || '');
      setData((d as SiteContentRow)?.data || {});
    })();
    (async () => {
      const { data: b } = await supabase.from('site_content').select('*').eq('slug', 'branding').maybeSingle();
      const branding = b as SiteContentRow | null;
      setFaviconUrl((branding?.data?.favicon_url as string) || null);
    })();
    (async () => {
      const { data: f } = await supabase.from('recruitment_forms').select('*').eq('is_active', true).maybeSingle();
      if (f) { setRf(f as RecruitmentFormRow); setFields((f as RecruitmentFormRow).fields || []); setRfMeta({ title: (f as RecruitmentFormRow).title, intro: (f as RecruitmentFormRow).intro || '', consent_text: (f as RecruitmentFormRow).consent_text }); }
      else { setRf(null); setFields([]); setRfMeta({ title: 'Join Team Synf', intro: '', consent_text: 'I agree to be contacted about my application.' }); }
    })();
  }, [slug, isAdminOrOwner]);

  async function saveContent() {
    setSaving(true); setSaved(false);
    const payload = { slug, title: PAGES.find(p => p.slug === slug)?.title || slug, body, data, is_public: slug !== 'home_hero' ? true : (data?.is_public ?? true), updated_at: new Date().toISOString() };
    const { error } = await supabase.from('site_content').upsert(payload);
    setSaving(false);
    if (!error) setSaved(true);
  }

  async function saveForm() {
    setSaving(true);
    const version = (rf?.version || 0) + 1;
    // Deactivate old, insert new version
    if (rf) await supabase.from('recruitment_forms').update({ is_active: false }).eq('id', rf.id);
    const { data: d } = await supabase.from('recruitment_forms').insert({
      version, is_active: true, title: rfMeta.title, intro: rfMeta.intro, consent_text: rfMeta.consent_text,
      fields, published_at: new Date().toISOString(), created_by: null,
    }).select('*').single();
    setRf(d as RecruitmentFormRow);
    setSaving(false);
    setSaved(true);
  }

  function addField() { setFields(f => [...f, { id: 'f_' + Date.now(), type: 'short_text', label: 'New field', required: false }]); }
  function updateField(id: string, patch: Partial<FormField>) { setFields(f => f.map(x => x.id === id ? { ...x, ...patch } : x)); }
  function removeField(id: string) { setFields(f => f.filter(x => x.id !== id)); }

  async function uploadFavicon(file: File) {
    setFavUploading(true);
    setFavError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const allowed = ['svg', 'png', 'ico', 'jpg', 'jpeg', 'webp'];
      if (!allowed.includes(ext)) {
        setFavError('Please upload an SVG, PNG, ICO, JPG, or WebP file.');
        setFavUploading(false);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setFavError('File must be under 2 MB.');
        setFavUploading(false);
        return;
      }
      const path = `favicon/favicon-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('site-assets').getPublicUrl(path);
      const url = pub.publicUrl;

      // Persist to site_content slug 'branding'
      const { data: existing } = await supabase.from('site_content').select('*').eq('slug', 'branding').maybeSingle();
      const existingData = (existing as SiteContentRow)?.data || {};
      const payload = {
        slug: 'branding',
        title: 'Branding',
        body: null,
        data: { ...existingData, favicon_url: url },
        is_public: true,
        updated_at: new Date().toISOString(),
      };
      const { error: dbErr } = await supabase.from('site_content').upsert(payload);
      if (dbErr) throw dbErr;

      setFaviconUrl(url);
      applyFavicon(url);
    } catch (err) {
      setFavError((err as Error).message || 'Upload failed.');
    } finally {
      setFavUploading(false);
    }
  }

  async function removeFavicon() {
    setFavUploading(true);
    try {
      const { data: existing } = await supabase.from('site_content').select('*').eq('slug', 'branding').maybeSingle();
      const existingData = (existing as SiteContentRow)?.data || {};
      const restData = { ...existingData };
      delete restData.favicon_url;
      const payload = {
        slug: 'branding',
        title: 'Branding',
        body: null,
        data: restData,
        is_public: true,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('site_content').upsert(payload);
      setFaviconUrl(null);
      document.querySelectorAll('link[data-favicon="custom"]').forEach(l => l.remove());
    } finally {
      setFavUploading(false);
    }
  }

  if (!isAdminOrOwner) return <div className="text-white/50">Admin access required.</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-extrabold tracking-tight">Content</h1><p className="text-white/50">Edit site copy, homepage hero, branding and recruitment form.</p></div>

      {/* Branding — Favicon */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-extrabold"><ImageIcon size={16} className="text-synf-400" /> Branding</h2>
        <p className="mb-4 text-sm text-white/50">Upload a website icon (favicon). Shown in the browser tab and on mobile home screens. SVG, PNG, ICO, JPG, or WebP up to 2 MB.</p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Preview */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="grid h-20 w-20 place-items-center rounded-xl border border-white/10 bg-ink-900/80">
              {faviconUrl ? (
                <img src={faviconUrl} alt="Favicon preview" className="h-12 w-12 object-contain" />
              ) : (
                <img src="/synf-mark.svg" alt="Default favicon" className="h-12 w-12 object-contain opacity-70" />
              )}
            </div>
            <span className="text-[10px] uppercase tracking-wider text-ink-500">{faviconUrl ? 'Custom' : 'Default'}</span>
          </div>

          {/* Upload controls */}
          <div className="flex-1 space-y-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-6 text-sm text-white/50 transition hover:border-synf-500/40 hover:text-white/70">
              <Upload size={16} />
              {favUploading ? 'Uploading…' : 'Choose file to upload'}
              <input
                type="file"
                accept="image/svg+xml,image/png,image/x-icon,image/jpeg,image/webp"
                className="hidden"
                disabled={favUploading}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) uploadFavicon(f);
                  e.target.value = '';
                }}
              />
            </label>

            {favError && <p className="text-sm text-synf-400">{favError}</p>}

            {faviconUrl && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-acid-400"><Check size={12} /> Favicon is live</span>
                <button onClick={removeFavicon} disabled={favUploading} className="text-xs text-white/40 underline hover:text-synf-400">Remove & use default</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-display text-lg font-extrabold">Site pages</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {PAGES.map(p => <button key={p.slug} onClick={() => setSlug(p.slug)} className={`chip border ${slug === p.slug ? 'border-synf-500/40 bg-synf-500/20 text-synf-300' : 'border-white/10 text-white/60'}`}>{p.title}</button>)}
        </div>

        {slug === 'home_hero' ? (
          <div className="space-y-3">
            <div><label className="label">Headline</label><input className="input" value={(data.headline as string) || ''} onChange={e => setData(d => ({ ...d, headline: e.target.value }))} placeholder="WE DON'T DO ORDINARY." /></div>
            <div><label className="label">Subhead</label><input className="input" value={(data.subhead as string) || ''} onChange={e => setData(d => ({ ...d, subhead: e.target.value }))} /></div>
          </div>
        ) : (
          <div><label className="label">Body text</label><textarea className="input min-h-[240px]" value={body} onChange={e => setBody(e.target.value)} /></div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveContent} disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Saving…' : 'Save'}</button>
          {saved && <span className="text-sm text-acid-400">Saved</span>}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div className="flex items-center justify-between"><h2 className="font-display text-lg font-extrabold">Recruitment form builder</h2>{rf && <span className="text-xs text-ink-500">Active version {rf.version}</span>}</div>
        <div className="grid gap-3">
          <div><label className="label">Form title</label><input className="input" value={rfMeta.title} onChange={e => setRfMeta(m => ({ ...m, title: e.target.value }))} /></div>
          <div><label className="label">Intro</label><input className="input" value={rfMeta.intro} onChange={e => setRfMeta(m => ({ ...m, intro: e.target.value }))} /></div>
          <div><label className="label">Consent text</label><textarea className="input min-h-[60px]" value={rfMeta.consent_text} onChange={e => setRfMeta(m => ({ ...m, consent_text: e.target.value }))} /></div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between"><span className="label">Fields</span><button onClick={addField} className="btn-outline py-1.5"><Plus size={14} /> Add field</button></div>
          {fields.map((f, i) => (
            <div key={f.id} className="rounded-lg border border-white/5 p-3 space-y-2">
              <div className="flex items-center justify-between"><span className="text-xs text-ink-500">Field {i + 1}</span><button onClick={() => removeField(f.id)} className="text-synf-400"><Trash2 size={14} /></button></div>
              <div className="grid gap-2 sm:grid-cols-3">
                <input className="input" placeholder="Label" value={f.label} onChange={e => updateField(f.id, { label: e.target.value })} />
                <select className="input" value={f.type} onChange={e => updateField(f.id, { type: e.target.value as FormField['type'] })}>{FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-synf-500" checked={!!f.required} onChange={e => updateField(f.id, { required: e.target.checked })} /> Required</label>
              </div>
              {['dropdown', 'multi_select', 'radio'].includes(f.type) && <input className="input" placeholder="Options (comma separated)" value={(f.options || []).join(', ')} onChange={e => updateField(f.id, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })} />}
              <input className="input" placeholder="Help text (optional)" value={f.help || ''} onChange={e => updateField(f.id, { help: e.target.value })} />
            </div>
          ))}
          {fields.length === 0 && <div className="rounded-lg border border-dashed border-ink-600 p-6 text-center text-sm text-ink-500"><FileText className="mx-auto h-8 w-8" /><p className="mt-2">No fields yet. Add short text, dropdown, etc.</p></div>}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={saveForm} disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Publishing…' : 'Publish form'}</button>
          {saved && <span className="text-sm text-acid-400">Published — new version is live</span>}
        </div>
        <p className="text-xs text-ink-500">Publishing creates a new version. Existing applications keep their original form snapshot so they stay readable.</p>
      </section>

      {/* Contact form builder */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-synf-400" />
          <h2 className="font-display text-xl font-extrabold">Contact Form</h2>
        </div>
        <FormBuilder
          formKey="contact"
          title="Contact"
          description="Customize the fields visitors see on the Contact page. Add, remove, or reorder fields — changes go live when you publish."
        />
      </section>

      {/* Collaboration form builder */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-synf-400" />
          <h2 className="font-display text-xl font-extrabold">Collaboration Form</h2>
        </div>
        <FormBuilder
          formKey="collaboration"
          title="Collaborate"
          description="Customize the fields on the Collaborate page. Tailor what you ask from brands, venues, DJs, and creative partners."
        />
      </section>
    </div>
  );
}
