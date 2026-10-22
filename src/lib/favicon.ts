import { useEffect } from 'react';
import { supabase } from './supabase';
import type { SiteContentRow } from './types';

/**
 * Applies the stored favicon (from site_content slug 'branding') to the document.
 * Runs on every public page so the admin-uploaded favicon is always used.
 * Falls back to /synf-mark.svg when no custom favicon is set.
 */
export function useFavicon() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('site_content')
        .select('*')
        .eq('slug', 'branding')
        .maybeSingle();
      if (cancelled || !data) return;
      const row = data as SiteContentRow;
      const fav = (row.data?.favicon_url as string) || null;
      if (!fav) return;
      applyFavicon(fav);
    })();
    return () => { cancelled = true; };
  }, []);
}

export function applyFavicon(url: string) {
  const type = url.endsWith('.svg') ? 'image/svg+xml'
    : url.endsWith('.png') ? 'image/png'
    : url.endsWith('.ico') ? 'image/x-icon'
    : url.endsWith('.jpg') || url.endsWith('.jpeg') ? 'image/jpeg'
    : 'image/svg+xml';

  // Remove existing custom favicon links
  document.querySelectorAll('link[data-favicon="custom"]').forEach(l => l.remove());

  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = type;
  link.href = url;
  link.setAttribute('data-favicon', 'custom');
  document.head.appendChild(link);

  // Also update the manifest icon if present
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    // Manifest stays as-is; browsers pick up the <link rel="icon"> for tab display
  }
}
