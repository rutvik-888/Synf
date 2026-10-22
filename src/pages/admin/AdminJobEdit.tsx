import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, X, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { FormField, FieldType, JobPostingRow, JobArrangement, JobStatus } from '@/lib/types';
import { JOB_ARRANGEMENT_LABELS, JOB_STATUS_LABELS } from '@/lib/types';
import { slugify } from '@/lib/format';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File Upload' },
];

const DEFAULT_FIELDS: FormField[] = [
  { id: 'full_name', type: 'short_text', label: 'Full Name', required: true },
  { id: 'email', type: 'email', label: 'Email Address', required: true },
  { id: 'phone', type: 'phone', label: 'Phone Number' },
  { id: 'college_org', type: 'short_text', label: 'College / Organization' },
  { id: 'experience', type: 'long_text', label: 'Relevant Experience', required: true },
  { id: 'skills', type: 'long_text', label: 'Skills & Interests', required: true },
  { id: 'why_join', type: 'long_text', label: 'Why do you want to join Team Synf?', required: true },
  { id: 'availability', type: 'long_text', label: 'Availability' },
  { id: 'portfolio_links', type: 'url', label: 'Portfolio / Social Media Links' },
];

export function AdminJobEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id || id === 'new';
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    title: '', department: 'Event Operations', description: '', responsibilities: '',
    eligibility: '', num_openings: '', arrangement: 'volunteer' as JobArrangement,
    application_open: new Date().toISOString().split('T')[0], application_close: '',
    requires_portfolio: false, requires_cv: false, status: 'draft' as JobStatus,
    required_skills: '', preferred_skills: '',
  });
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [skillsReq, setSkillsReq] = useState<string[]>([]);
  const [skillsPref, setSkillsPref] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data } = await supabase.from('job_postings').select('*').eq('id', id).maybeSingle();
      if (data) {
        const j = data as JobPostingRow;
        setForm({
          title: j.title, department: j.department, description: j.description || '', responsibilities: j.responsibilities || '',
          eligibility: j.eligibility || '', num_openings: j.num_openings ? String(j.num_openings) : '',
          arrangement: j.arrangement, application_open: j.application_open, application_close: j.application_close || '',
          requires_portfolio: j.requires_portfolio, requires_cv: j.requires_cv, status: j.status,
          required_skills: '', preferred_skills: '',
        });
        setSkillsReq(j.required_skills || []);
        setSkillsPref(j.preferred_skills || []);
        setFields(j.form_fields?.length ? j.form_fields : DEFAULT_FIELDS);
      }
    })();
  }, [id, isNew]);

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })); }

  function addSkill(target: 'req' | 'pref') {
    if (!skillInput.trim()) return;
    if (target === 'req') setSkillsReq(s => [...s, skillInput.trim()]);
    else setSkillsPref(s => [...s, skillInput.trim()]);
    setSkillInput('');
  }
  function removeSkill(target: 'req' | 'pref', idx: number) {
    if (target === 'req') setSkillsReq(s => s.filter((_, i) => i !== idx));
    else setSkillsPref(s => s.filter((_, i) => i !== idx));
  }

  function addField() {
    setFields(fs => [...fs, { id: `field_${Date.now()}`, type: 'short_text', label: 'New Field', required: false }]);
  }
  function updateField(idx: number, patch: Partial<FormField>) {
    setFields(fs => fs.map((f, i) => i === idx ? { ...f, ...patch } : f));
  }
  function removeField(idx: number) {
    setFields(fs => fs.filter((_, i) => i !== idx));
  }

  async function save(publish = false) {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setSaving(true); setErr('');
    const slug = slugify(form.title) + '-' + Date.now().toString(36).slice(-4);
    const payload = {
      slug,
      title: form.title.trim(),
      department: form.department,
      description: form.description || null,
      responsibilities: form.responsibilities || null,
      required_skills: skillsReq.length ? skillsReq : null,
      preferred_skills: skillsPref.length ? skillsPref : null,
      eligibility: form.eligibility || null,
      num_openings: form.num_openings ? parseInt(form.num_openings) : null,
      arrangement: form.arrangement,
      application_open: form.application_open,
      application_close: form.application_close || null,
      form_fields: fields,
      requires_portfolio: form.requires_portfolio,
      requires_cv: form.requires_cv,
      status: publish ? 'published' : form.status,
    };

    if (isNew) {
      const { error } = await supabase.from('job_postings').insert({ ...payload, created_by: user?.id });
      if (error) { setErr(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('job_postings').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) { setErr(error.message); setSaving(false); return; }
    }
    navigate('/admin/jobs');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/admin/jobs')} className="flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={16} /> Back to jobs</button>
      </div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{isNew ? 'New Job Posting' : 'Edit Job'}</h1>

      {err && <div className="rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300">{err}</div>}

      {/* Basic info */}
      <div className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">Basic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Job title *</label><input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Event Operations Crew" /></div>
          <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => set('department', e.target.value)} /></div>
        </div>
        <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Role overview…" /></div>
        <div><label className="label">Responsibilities</label><textarea className="input min-h-[80px]" value={form.responsibilities} onChange={e => set('responsibilities', e.target.value)} placeholder="What will they do?" /></div>
        <div><label className="label">Eligibility / Experience</label><textarea className="input min-h-[60px]" value={form.eligibility} onChange={e => set('eligibility', e.target.value)} placeholder="Requirements…" /></div>
      </div>

      {/* Skills */}
      <div className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">Skills</h2>
        <div>
          <label className="label">Required skills</label>
          <div className="flex flex-wrap gap-2">
            {skillsReq.map((s, i) => <span key={i} className="chip border border-synf-500/30 bg-synf-500/10 text-synf-300">{s}<button onClick={() => removeSkill('req', i)} className="ml-1"><X size={12} /></button></span>)}
          </div>
          <div className="mt-2 flex gap-2"><input className="input flex-1" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill('req'))} placeholder="Type a skill and press Enter" /></div>
        </div>
        <div>
          <label className="label">Preferred skills</label>
          <div className="flex flex-wrap gap-2">
            {skillsPref.map((s, i) => <span key={i} className="chip border border-white/10 bg-ink-900 text-white/70">{s}<button onClick={() => removeSkill('pref', i)} className="ml-1"><X size={12} /></button></span>)}
          </div>
        </div>
      </div>

      {/* Logistics */}
      <div className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">Logistics</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">Arrangement</label><select className="input" value={form.arrangement} onChange={e => set('arrangement', e.target.value as JobArrangement)}>{Object.entries(JOB_ARRANGEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label">Number of openings</label><input className="input" type="number" min="1" value={form.num_openings} onChange={e => set('num_openings', e.target.value)} /></div>
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={e => set('status', e.target.value as JobStatus)}>{Object.entries(JOB_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label">Application opens</label><input className="input" type="date" value={form.application_open} onChange={e => set('application_open', e.target.value)} /></div>
          <div><label className="label">Application closes</label><input className="input" type="date" value={form.application_close} onChange={e => set('application_close', e.target.value)} /></div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" className="accent-synf-500" checked={form.requires_portfolio} onChange={e => set('requires_portfolio', e.target.checked)} /> Requires portfolio</label>
          <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" className="accent-synf-500" checked={form.requires_cv} onChange={e => set('requires_cv', e.target.checked)} /> Requires CV</label>
        </div>
      </div>

      {/* Form builder */}
      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Application Form</h2>
          <button onClick={addField} className="btn-ghost"><Plus size={14} /> Add field</button>
        </div>
        <p className="text-xs text-ink-500">These fields appear when an applicant clicks Apply Now. The first two fields (full_name, email) are used for the applicant's identity and email notifications.</p>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={f.id} className="flex items-start gap-2 rounded-lg border border-white/5 bg-ink-900/50 p-3">
              <GripVertical size={16} className="mt-2 shrink-0 text-ink-600" />
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                <input className="input" value={f.label} onChange={e => updateField(i, { label: e.target.value })} placeholder="Label" />
                <select className="input" value={f.type} onChange={e => updateField(i, { type: e.target.value as FieldType })}>{FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                <input className="input" value={(f.options || []).join(', ')} onChange={e => updateField(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Options (comma-separated)" />
              </div>
              <div className="flex shrink-0 items-center gap-2 pt-2">
                <label className="flex items-center gap-1 text-xs text-white/60"><input type="checkbox" className="accent-synf-500" checked={!!f.required} onChange={e => updateField(i, { required: e.target.checked })} /> Req</label>
                <button onClick={() => removeField(i)} className="text-synf-400 hover:text-synf-300"><X size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => save(false)} disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Saving…' : 'Save'}</button>
        <button onClick={() => save(true)} disabled={saving} className="btn-ghost">Save & Publish</button>
      </div>
    </div>
  );
}
