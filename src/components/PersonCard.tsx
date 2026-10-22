import type { PersonRow, DepartmentRow } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';
import { Instagram } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  core_team: 'Core Team',
  dj_artist: 'DJ / Artist',
  creative_team: 'Creative',
  collaborator: 'Collaborator',
};

export function PersonCard({ person }: { person: PersonRow }) {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from('departments').select('id,name').eq('is_active', true);
      if (active && data) setDepartments(data as DepartmentRow[]);
    })();
    return () => { active = false; };
  }, []);

  const deptName = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departments) map.set(d.id, d.name);
    return (id: string | null | undefined) => (id ? (map.get(id) || id) : '');
  }, [departments]);

  const primaryLabel = person.category ? (CATEGORY_LABELS[person.category] || deptName(person.category)) : '';
  const secondaryLabel = person.secondary_category ? deptName(person.secondary_category) : '';

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900 transition-all duration-500 hover:border-synf-500/40 hover:shadow-[0_0_60px_-15px] hover:shadow-synf-500/30">
      <div className="relative aspect-[3/4] overflow-hidden">
        {person.portrait_url ? (
          <img
            src={person.portrait_url}
            alt={person.portrait_alt || person.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-all duration-[800ms] group-hover:scale-105 grayscale-[0.3] group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900">
            <span className="font-display text-7xl font-extrabold text-white/10">{person.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent transition-opacity duration-500 group-hover:from-ink-950" />
        {primaryLabel && (
          <span className="absolute left-3 top-3 chip border border-white/15 bg-ink-950/70 text-white/80 backdrop-blur-sm">
            {primaryLabel}
          </span>
        )}
        {secondaryLabel && (
          <span className="absolute right-3 top-3 chip border border-white/10 bg-ink-950/70 text-white/60 backdrop-blur-sm">
            {secondaryLabel}
          </span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-extrabold leading-tight transition-transform duration-300 group-hover:translate-x-1">{person.name}</h3>
        {person.role && <p className="text-sm text-synf-300">{person.role}</p>}
        {person.bio && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/55 transition-colors duration-300 group-hover:text-white/70">{person.bio}</p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-3">
          {person.instagram_url && (
            <a href={person.instagram_url} target="_blank" rel="noopener noreferrer" className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/50 transition-all hover:bg-synf-500/20 hover:text-synf-400" aria-label={`${person.name} on Instagram`}>
              <Instagram size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
