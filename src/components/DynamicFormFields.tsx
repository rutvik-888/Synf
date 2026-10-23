import React, { useEffect, useState } from 'react';
import type { FormField } from '@/lib/types';

interface DynamicFormFieldsProps {
  fields: FormField[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (id: string, value: string) => void;
}

export function DynamicFormFields({ fields, values, errors, onChange }: DynamicFormFieldsProps) {
  return (
    <>
      {fields.map((field) => {
        const val = values[field.id] ?? '';
        const err = errors[field.id];
        const label = field.required ? `${field.label} *` : field.label;

        return (
          <div key={field.id}>
            <label className="label">{label}</label>
            {renderField(field, val, (v) => onChange(field.id, v))}
            {field.help && <p className="mt-1 text-xs text-white/40">{field.help}</p>}
            {err && <p className="mt-1 text-xs text-synf-400">{err}</p>}
          </div>
        );
      })}
    </>
  );
}

function renderField(field: FormField, value: string, onChange: (v: string) => void) {
  switch (field.type) {
    case 'long_text':
      return (
        <textarea
          className="input min-h-[120px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          aria-invalid={!!value === false && field.required}
        />
      );

    case 'dropdown':
      return (
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div className="flex flex-wrap gap-3">
          {(field.options || []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={(e) => onChange(e.target.value)}
                className="accent-synf-500"
              />
              {opt}
            </label>
          ))}
        </div>
      );

    case 'multi_select':
      return (
        <MultiSelect field={field} value={value} onChange={onChange} />
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : '')}
            className="accent-synf-500"
          />
          {field.placeholder || 'Yes'}
        </label>
      );

    case 'date':
      return (
        <input
          className="input"
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'email':
      return (
        <input
          className="input"
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
        />
      );

    case 'phone':
      return (
        <input
          className="input"
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || '+91…'}
        />
      );

    case 'url':
      return (
        <input
          className="input"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'https://…'}
        />
      );

    case 'short_text':
    default:
      return (
        <input
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
        />
      );
  }
}

function MultiSelect({ field, value, onChange }: { field: FormField; value: string; onChange: (v: string) => void }) {
  const selected = value ? value.split(',').map((s) => s.trim()) : [];

  function toggle(opt: string) {
    const set = new Set(selected);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    onChange(Array.from(set).join(', '));
  }

  return (
    <div className="flex flex-wrap gap-3">
      {(field.options || []).map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="accent-synf-500"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

export function validateFormFields(fields: FormField[], values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const val = (values[field.id] ?? '').trim();

    if (field.required && !val) {
      errors[field.id] = `${field.label} is required`;
      continue;
    }

    if (!val) continue;

    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      errors[field.id] = 'Please enter a valid email';
    } else if (field.type === 'phone' && !/^[+]?[\d\s()-]{6,20}$/.test(val)) {
      errors[field.id] = 'Invalid phone format';
    } else if (field.type === 'url' && !/^https?:\/\/.+/i.test(val)) {
      errors[field.id] = 'Must start with http:// or https://';
    } else if (field.type === 'long_text' && val.length < 10) {
      errors[field.id] = 'Message too short (min 10 characters)';
    }
  }

  return errors;
}

export function useFormFields(fields: FormField[]): [Record<string, string>, (id: string, v: string) => void, () => void] {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues({});
  }, [fields]);

  const set = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }));
  const reset = () => setValues({});

  return [values, set, reset];
}
