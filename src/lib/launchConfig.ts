import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type LaunchConfig = {
  enabled: boolean;
  launch_date: string | null;
  headline: string;
  subheadline: string;
  background_theme: string;
  show_email_signup: boolean;
};

const DEFAULT: LaunchConfig = {
  enabled: false,
  launch_date: null,
  headline: 'Something extraordinary is coming',
  subheadline: 'Team Synf — We don\u2019t do ordinary.',
  background_theme: 'synf',
  show_email_signup: true,
};

let cached: LaunchConfig | null = null;

/** Fetches the launch config from site_content. Public-readable. */
export async function fetchLaunchConfig(): Promise<LaunchConfig> {
  const { data } = await supabase
    .from('site_content')
    .select('data, is_public')
    .eq('slug', 'launch_config')
    .maybeSingle();

  if (data && data.is_public) {
    cached = { ...DEFAULT, ...(data.data as Record<string, unknown>) } as LaunchConfig;
  } else {
    cached = DEFAULT;
  }
  return cached;
}

/** Returns true if launch mode is active and the countdown hasn't reached zero. */
export function isLaunchActive(cfg: LaunchConfig | null): boolean {
  if (!cfg || !cfg.enabled || !cfg.launch_date) return false;
  return new Date(cfg.launch_date).getTime() > Date.now();
}

/** React hook for components that need the launch config reactively. */
export function useLaunchConfig() {
  const [config, setConfig] = useState<LaunchConfig | null>(cached);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    if (cached) {
      setConfig(cached);
      setLoading(false);
      return;
    }
    fetchLaunchConfig().then(c => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  return { config, loading, refresh: fetchLaunchConfig };
}
