import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Plus, Trash2, FileText } from 'lucide-react';
import type { FormDefinitionRow, FormField } from '@/lib/types';

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

interface FormBuilderProps {
  formKey: 'contact' | 'collaboration';
  title: string;
  description: string;
}

export function FormBuilder({ formKey, title, description }: FormBuilderProps) {
  const [formDef, setFormDef] = useState<FormDefinitionRow | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [meta, setMeta] = useState({ title: '', intro: '', consent_text: '', success_message: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('form_definitions')
        .select('*')
        .eq('form_key', formKey)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const d = data as FormDefinitionRow;
        setFormDef(d);
        setFields(d.fields || []);
        setMeta({
          title: d.title,
          intro: d.intro || '',
          consent_text: d.consent_text,
          success_message: d.success_message || '',
        });
      } else {
        setFormDef(null);
        setFields([]);
        setMeta({ title, intro: '', consent_text: 'I agree to be contacted regarding my enquiry. My data will be stored and used per the Privacy Policy.', success_message: '' });
      }
    })();
  }, [formKey, title]);

  function addField() {
    setFields(f => [...f, { id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), type: 'short_text', label: 'New field', required: false }]);
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields(f => f.map(x => x.id === id ? { ...x, ...patch } : x));
  }

  function removeField(id: string) {
    setFields(f => f.filter(x => x.id !== id));
  }

  async function saveForm() {
    setSaving(true);
    setSaved(false);
    const version = (formDef?.version || 0) + 1;
    if (formDef) {
      await supabase.from('form_definitions').update({ is_active: false }).eq('id', formDef.id);
    }
    const { data: d } = await supabase.from('form_definitions').insert({
      form_key: formKey,
      version,
      is_active: true,
      title: meta.title,
      intro: meta.intro || null,
      consent_text: meta.consent_text,
      success_message: meta.success_message || null,
      fields,
      published_at: new Date().toISOString(),
      created_by: null,
    }).select('*').single();
    setFormDef(d as FormDefinitionRow);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-extrabold">{title} form builder</h3>
          <p className="text-sm text-white/50">{description}</p>
        </div>
        {formDef && <span className="text-xs text-ink-500">Active version {formDef.version}</span>}
      </div>

      <div className="grid gap-3">
        <div><label className="label">Form title</label><input className="input" value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} /></div>
        <div><label className="label">Intro text (shown above the form)</label><input className="input" value={meta.intro} onChange={e => setMeta(m => ({ ...m, intro: e.target.value }))} /></div>
        <div><label className="label">Success message</label><input className="input" value={meta.success_message} onChange={e => setMeta(m => ({ ...m, success_message: e.target.value }))} placeholder="Shown after the form is submitted" /></div>
        <div><label className="label">Consent text</label><textarea className="input min-h-[60px]" value={meta.consent_text} onChange={e => setMeta(m => ({ ...m, consent_text: e.target.value }))} /></div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="label">Fields</span>
          <button onClick={addField} className="btn-outline py-1.5"><Plus size={14} /> Add field</button>
        </div>
        {fields.map((f, i) => (
          <div key={f.id} className="rounded-lg border border-white/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-500">Field {i + 1}</span>
              <button onClick={() => removeField(f.id)} className="text-synf-400"><Trash2 size={14} /></button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="input" placeholder="Label" value={f.label} onChange={e => updateField(f.id, { label: e.target.value })} />
              <select className="input" value={f.type} onChange={e => updateField(f.id, { type: e.target.value as FormField['type'] })}>
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-synf-500" checked={!!f.required} onChange={e => updateField(f.id, { required: e.target.checked })} /> Required</label>
            </div>
            <input className="input" placeholder="Placeholder text (optional)" value={f.placeholder || ''} onChange={e => updateField(f.id, { placeholder: e.target.value })} />
            <input className="input" placeholder="Help text (optional)" value={f.help || ''} onChange={e => updateField(f.id, { help: e.target.value })} />
            {['dropdown', 'multi_select', 'radio'].includes(f.type) && (
              <input className="input" placeholder="Options (comma separated)" value={(f.options || []).join(', ')} onChange={e => updateField(f.id, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })} />
            )}
          </div>
        ))}
        {fields.length === 0 && (
          <div className="rounded-lg border border-dashed border-ink-600 p-6 text-center text-sm text-ink-500">
            <FileText className="mx-auto h-8 w-8" />
            <p className="mt-2">No fields yet. Add short text, dropdown, email, etc.</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={saveForm} disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Publishing…' : 'Publish form'}</button>
        {saved && <span className="text-sm text-acid-400">Published — new version is live</span>}
      </div>
      <p className="text-xs text-ink-500">Publishing creates a new version. The public page will use the latest active version automatically.</p>
    </div>
  );
}
