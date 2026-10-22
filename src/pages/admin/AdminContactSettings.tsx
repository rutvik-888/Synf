import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, GripVertical, Eye, EyeOff, Settings, Bell, ShieldCheck, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { EnquiryCategoryRow } from '@/lib/types';

type ContactSettings = {
  hero_heading: string;
  hero_subheading: string;
  public_email: string;
  show_public_email: boolean;
  internal_recipient: string;
  acknowledgement_email_enabled: boolean;
  internal_notification_enabled: boolean;
  attachment_enabled: boolean;
  max_attachment_size_mb: number;
  allowed_attachment_types: string[];
  show_phone_field: boolean;
  show_organization_field: boolean;
  show_links_field: boolean;
  show_preferred_contact: boolean;
  success_message: string;
  response_time_text: string;
  show_response_time: boolean;
};

const DEFAULT_SETTINGS: ContactSettings = {
  hero_heading: "Let's Start a Conversation.",
  hero_subheading: 'Questions, press, partnerships, feedback — whatever it is, we\'re listening.',
  public_email: 'synf.c@com.gh',
  show_public_email: true,
  internal_recipient: 'synf.c@com.gh',
  acknowledgement_email_enabled: true,
  internal_notification_enabled: true,
  attachment_enabled: false,
  max_attachment_size_mb: 10,
  allowed_attachment_types: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'],
  show_phone_field: true,
  show_organization_field: true,
  show_links_field: true,
  show_preferred_contact: true,
  success_message: 'Your message has been received. Our team will review it and reach out if a response is needed.',
  response_time_text: '',
  show_response_time: false,
};

export function AdminContactSettings() {
  const { isAdminOrOwner } = useAuth();
  const [settings, setSettings] = useState<ContactSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<EnquiryCategoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'public' | 'notifications' | 'categories' | 'spam'>('public');
  const [newCat, setNewCat] = useState({ display_name: '', slug: '', description: '', icon_name: 'MessageSquare' });

  useEffect(() => {
    (async () => {
      const [{ data: sc }, { data: cats }] = await Promise.all([
        supabase.from('site_content').select('data').eq('slug', 'contact_settings').maybeSingle(),
        supabase.from('enquiry_categories').select('*').order('sort_order'),
      ]);
      if (sc?.data) setSettings({ ...DEFAULT_SETTINGS, ...(sc.data as Partial<ContactSettings>) });
      setCategories((cats as EnquiryCategoryRow[]) || []);
    })();
  }, []);

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase.from('site_content').update({ data: settings as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }).eq('slug', 'contact_settings');
    setSaving(false);
    if (error) showToast('err', error.message);
    else showToast('ok', 'Settings saved.');
  }

  const set = <K extends keyof ContactSettings>(k: K, v: ContactSettings[K]) => setSettings(s => ({ ...s, [k]: v }));

  async function addCategory() {
    if (!newCat.display_name.trim() || !newCat.slug.trim()) { showToast('err', 'Name and slug are required'); return; }
    const slug = newCat.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const { data, error } = await supabase.from('enquiry_categories').insert({
      display_name: newCat.display_name,
      slug,
      description: newCat.description || null,
      icon_name: newCat.icon_name || 'MessageSquare',
      sort_order: categories.length + 1,
    }).select('*').single();
    if (error) { showToast('err', error.message); return; }
    setCategories(arr => [...arr, data as EnquiryCategoryRow]);
    setNewCat({ display_name: '', slug: '', description: '', icon_name: 'MessageSquare' });
    showToast('ok', 'Category added.');
  }

  async function updateCategory(id: string, field: string, value: unknown) {
    await supabase.from('enquiry_categories').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    setCategories(arr => arr.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category? Existing enquiries will keep their category reference.')) return;
    await supabase.from('enquiry_categories').delete().eq('id', id);
    setCategories(arr => arr.filter(c => c.id !== id));
  }

  async function moveCategory(id: string, dir: -1 | 1) {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(c => c.id === id);
    if (idx < 0 || (dir === -1 && idx === 0) || (dir === 1 && idx === sorted.length - 1)) return;
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from('enquiry_categories').update({ sort_order: swap.sort_order }).eq('id', id),
      supabase.from('enquiry_categories').update({ sort_order: sorted[idx].sort_order }).eq('id', swap.id),
    ]);
    setCategories(arr => arr.map(c => {
      if (c.id === id) return { ...c, sort_order: swap.sort_order };
      if (c.id === swap.id) return { ...c, sort_order: sorted[idx].sort_order };
      return c;
    }));
  }

  if (!isAdminOrOwner) return <div className="text-white/50">Admin access required to manage contact settings.</div>;

  const tabs = [
    { key: 'public' as const, label: 'Public Page', icon: Eye },
    { key: 'notifications' as const, label: 'Notifications', icon: Bell },
    { key: 'categories' as const, label: 'Categories', icon: FileText },
    { key: 'spam' as const, label: 'Anti-Spam & Retention', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Contact Settings</h1>
        <p className="text-white/50">Configure the public contact page, notifications, and enquiry categories.</p>
      </div>

      {toast && <div className={`rounded-lg border p-3 text-sm ${toast.type === 'ok' ? 'border-acid-400/30 bg-acid-400/10 text-acid-300' : 'border-synf-500/30 bg-synf-500/10 text-synf-300'}`}>{toast.msg}</div>}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-white/5">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium transition ${activeTab === t.key ? 'border-b-2 border-synf-500 text-synf-400' : 'text-white/50 hover:text-white'}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'public' && (
        <div className="space-y-5">
          <Section title="Hero Section">
            <div><label className="label">Heading</label><input className="input" value={settings.hero_heading} onChange={e => set('hero_heading', e.target.value)} /></div>
            <div><label className="label">Subheading</label><textarea className="input min-h-[60px]" value={settings.hero_subheading} onChange={e => set('hero_subheading', e.target.value)} /></div>
          </Section>

          <Section title="Contact Display">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Public contact email</label><input className="input" value={settings.public_email} onChange={e => set('public_email', e.target.value)} /></div>
              <Toggle label="Show public email on contact page" value={settings.show_public_email} onChange={v => set('show_public_email', v)} />
            </div>
          </Section>

          <Section title="Form Fields">
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Show phone field" value={settings.show_phone_field} onChange={v => set('show_phone_field', v)} />
              <Toggle label="Show organization field" value={settings.show_organization_field} onChange={v => set('show_organization_field', v)} />
              <Toggle label="Show links/portfolio field" value={settings.show_links_field} onChange={v => set('show_links_field', v)} />
              <Toggle label="Show preferred contact method" value={settings.show_preferred_contact} onChange={v => set('show_preferred_contact', v)} />
            </div>
          </Section>

          <Section title="Success Message & Response Time">
            <div><label className="label">Success message</label><textarea className="input min-h-[60px]" value={settings.success_message} onChange={e => set('success_message', e.target.value)} /></div>
            <Toggle label="Show expected response time" value={settings.show_response_time} onChange={v => set('show_response_time', v)} />
            {settings.show_response_time && <div><label className="label">Response time text</label><input className="input" value={settings.response_time_text} onChange={e => set('response_time_text', e.target.value)} placeholder="e.g. We typically respond within 2–3 business days." /></div>}
          </Section>

          <button onClick={saveSettings} disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-5">
          <Section title="Email Recipients">
            <div><label className="label">Internal notification recipient</label><input className="input" value={settings.internal_recipient} onChange={e => set('internal_recipient', e.target.value)} placeholder="synf.c@com.gh" /></div>
          </Section>

          <Section title="Email Notifications">
            <Toggle label="Send visitor acknowledgement email" value={settings.acknowledgement_email_enabled} onChange={v => set('acknowledgement_email_enabled', v)} />
            <Toggle label="Send internal notification email" value={settings.internal_notification_enabled} onChange={v => set('internal_notification_enabled', v)} />
          </Section>

          <div className="card p-4">
            <p className="text-sm text-white/60">Email templates for enquiry acknowledgements and internal notifications can be edited in the{' '}
              <a href="/admin/templates" className="text-synf-400 underline">Email Templates</a> page. Look for the <code className="rounded bg-white/10 px-1 text-xs">enquiry_acknowledgement</code> and <code className="rounded bg-white/10 px-1 text-xs">enquiry_internal_notify</code> templates.
            </p>
          </div>

          <button onClick={saveSettings} disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-5">
          <div className="card space-y-3 p-4">
            <h3 className="font-display text-sm font-bold">Add New Category</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Display name</label><input className="input" value={newCat.display_name} onChange={e => setNewCat(f => ({ ...f, display_name: e.target.value }))} placeholder="e.g. Sponsorship" /></div>
              <div><label className="label">Slug (URL key)</label><input className="input" value={newCat.slug} onChange={e => setNewCat(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. sponsorship" /></div>
              <div><label className="label">Description</label><input className="input" value={newCat.description} onChange={e => setNewCat(f => ({ ...f, description: e.target.value }))} placeholder="Optional" /></div>
              <div><label className="label">Icon name</label><input className="input" value={newCat.icon_name} onChange={e => setNewCat(f => ({ ...f, icon_name: e.target.value }))} placeholder="MessageSquare, Calendar, etc." /></div>
            </div>
            <button onClick={addCategory} className="btn-primary"><Plus size={14} /> Add category</button>
          </div>

          <div className="card divide-y divide-white/5 overflow-hidden">
            {[...categories].sort((a, b) => a.sort_order - b.sort_order).map((cat, i, arr) => (
              <div key={cat.id} className="flex items-center gap-3 p-3">
                <GripVertical size={14} className="text-ink-600" />
                <div className="flex-1 grid gap-2 sm:grid-cols-3">
                  <input className="input text-sm" value={cat.display_name} onChange={e => updateCategory(cat.id, 'display_name', e.target.value)} />
                  <input className="input text-sm" value={cat.slug} disabled />
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
          </div>
        </div>
      )}

      {activeTab === 'spam' && (
        <div className="space-y-5">
          <Section title="Attachments">
            <Toggle label="Enable file attachments" value={settings.attachment_enabled} onChange={v => set('attachment_enabled', v)} />
            {settings.attachment_enabled && (
              <>
                <div><label className="label">Max attachment size (MB)</label><input className="input sm:w-32" type="number" value={settings.max_attachment_size_mb} onChange={e => set('max_attachment_size_mb', parseInt(e.target.value) || 10)} /></div>
                <div><label className="label">Allowed file types (comma-separated)</label><input className="input" value={settings.allowed_attachment_types.join(', ')} onChange={e => set('allowed_attachment_types', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} /></div>
              </>
            )}
          </Section>

          <div className="card p-4">
            <h3 className="font-display text-sm font-bold">Built-in Protections</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-white/60">
              <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-acid-400" /> Honeypot field traps bots silently</li>
              <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-acid-400" /> Rate limiting: max 5 enquiries per email per hour</li>
              <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-acid-400" /> Server-side email and message validation</li>
              <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-acid-400" /> Duplicate submission prevention via loading state lock</li>
              <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-acid-400" /> Row Level Security on all enquiry tables</li>
            </ul>
          </div>

          <button onClick={saveSettings} disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3 p-4">
      <h3 className="font-display text-sm font-bold uppercase tracking-widest text-synf-400">{title}</h3>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-white/80">
      <button type="button" onClick={() => onChange(!value)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? 'bg-synf-500' : 'bg-ink-800'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      {label}
    </label>
  );
}
