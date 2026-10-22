import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { SiteSectionRow } from './platform-types';

let cachedSections: Record<string, boolean> | null = null;
const subscribers = new Set<(map: Record<string, boolean>) => void>();

export function useSiteSections() {
  const [sections, setSections] = useState<Record<string, boolean>>(cachedSections || {});
  const [loaded, setLoaded] = useState(cachedSections !== null);

  useEffect(() => {
    const handler = (map: Record<string, boolean>) => setSections(map);
    subscribers.add(handler);

    if (cachedSections) {
      setSections(cachedSections);
      setLoaded(true);
      return () => { subscribers.delete(handler); };
    }

    (async () => {
      const { data } = await supabase.from('site_sections').select('*').order('sort_order');
      const map: Record<string, boolean> = {};
      (data as SiteSectionRow[] || []).forEach(s => { map[s.key] = s.is_visible; });
      cachedSections = map;
      setSections(map);
      setLoaded(true);
    })();

    return () => { subscribers.delete(handler); };
  }, []);

  const isVisible = useCallback((key: string): boolean => {
    if (key in sections) return sections[key];
    if (cachedSections && cachedSections[key] === false) return false;
    return true; // not yet loaded or unknown — visible by default
  }, [sections]);

  return { sections, isVisible, loaded };
}

export function refreshSiteSections() {
  cachedSections = null;
  (async () => {
    const { data } = await supabase.from('site_sections').select('*').order('sort_order');
    const map: Record<string, boolean> = {};
    (data as SiteSectionRow[] || []).forEach(s => { map[s.key] = s.is_visible; });
    cachedSections = map;
    subscribers.forEach(fn => fn(map));
  })();
}

// Map URL path prefixes to site section keys for route guarding.
// First matching prefix wins.
const ROUTE_SECTION_MAP: Array<{ prefix: string; section: string }> = [
  { prefix: '/events', section: 'events' },
  { prefix: '/about', section: 'about' },
  { prefix: '/people', section: 'people' },
  { prefix: '/jobs', section: 'jobs' },
  { prefix: '/collaborate', section: 'collaborate' },
  { prefix: '/contact', section: 'contact' },
  { prefix: '/community', section: 'community' },
  { prefix: '/goods', section: 'goods' },
  { prefix: '/pass', section: 'pass' },
];

export function sectionForPath(pathname: string): string | null {
  for (const { prefix, section } of ROUTE_SECTION_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return section;
  }
  return null;
}
