import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { TeamProfileRow, TeamMemberProfileRow } from './types';
import { isStaff as isStaffFn } from './types';

const SECRET_VERIFIED_KEY = 'synf_secret_verified_at';
const SECRET_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: TeamProfileRow | null;
  memberProfile: TeamMemberProfileRow | null;
  role: string | null;
  loading: boolean;
  isStaff: boolean;
  isAdminOrOwner: boolean;
  isOwner: boolean;
  isFounder: boolean;
  secretVerified: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  verifySecret: (code: string) => Promise<{ valid: boolean; error?: string; locked?: boolean }>;
  clearSecret: () => void;
  hasPermission: (module: string, action: string) => Promise<boolean>;
}

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<TeamProfileRow | null>(null);
  const [memberProfile, setMemberProfile] = useState<TeamMemberProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [secretVerified, setSecretVerified] = useState(false);

  async function loadProfile(uid: string) {
    const { data: tp } = await supabase.from('team_profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(tp as TeamProfileRow | null);

    const { data: tmp } = await supabase
      .from('team_member_profiles')
      .select(`
        *,
        department:departments(id,name),
        role_definition:role_definitions(id,display_name,hierarchy_level),
        join_classification:join_classifications(id,display_name)
      `)
      .eq('id', uid)
      .maybeSingle();
    setMemberProfile(tmp as TeamMemberProfileRow | null);
  }

  // Check secret verification status from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SECRET_VERIFIED_KEY);
      if (stored) {
        const ts = parseInt(stored, 10);
        if (Date.now() - ts < SECRET_VALIDITY_MS) {
          setSecretVerified(true);
        } else {
          sessionStorage.removeItem(SECRET_VERIFIED_KEY);
        }
      }
    } catch {
      // sessionStorage not available
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let profileLoading = false;

    async function ensureProfile(uid: string) {
      if (profileLoading) return;
      profileLoading = true;
      if (mounted) setLoading(true);
      await loadProfile(uid);
      profileLoading = false;
      if (mounted) setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        ensureProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) {
        ensureProfile(sess.user.id);
      } else {
        setProfile(null);
        setMemberProfile(null);
        setSecretVerified(false);
        try { sessionStorage.removeItem(SECRET_VERIFIED_KEY); } catch { /* ignore */ }
        setLoading(false);
      }
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const role = memberProfile?.role_id ?? profile?.role ?? (session?.user?.app_metadata?.role as string | undefined) ?? null;

  const value = useMemo<AuthState>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    memberProfile,
    role,
    loading,
    isStaff: isStaffFn(role),
    isAdminOrOwner: role === 'founder' || role === 'owner' || role === 'admin' || role === 'co_founder',
    isOwner: role === 'founder' || role === 'owner',
    isFounder: role === 'founder' || !!memberProfile?.is_founder,
    secretVerified,
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setMemberProfile(null);
      setSecretVerified(false);
      try { sessionStorage.removeItem(SECRET_VERIFIED_KEY); } catch { /* ignore */ }
    },
    refreshProfile: async () => { if (session?.user) await loadProfile(session.user.id); },
    verifySecret: async (code: string) => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token || '';
      if (!token) return { valid: false, error: 'Not authenticated' };
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login-secret`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'validate_secret', secret_code: code }),
        });
        const data = await res.json();
        if (data.valid) {
          setSecretVerified(true);
          try { sessionStorage.setItem(SECRET_VERIFIED_KEY, String(Date.now())); } catch { /* ignore */ }
          return { valid: true };
        }
        return { valid: false, error: data.error || 'Invalid secret code', locked: data.locked };
      } catch {
        return { valid: false, error: 'Network error' };
      }
    },
    clearSecret: () => {
      setSecretVerified(false);
      try { sessionStorage.removeItem(SECRET_VERIFIED_KEY); } catch { /* ignore */ }
    },
    hasPermission: async (module: string, action: string) => {
      if (!session?.user) return false;
      if (memberProfile?.is_founder) return true;
      const { data, error } = await supabase.rpc('has_permission', {
        p_user_id: session.user.id,
        p_module: module,
        p_action: action,
      });
      if (error) return false;
      return data === true;
    },
  }), [session, profile, memberProfile, role, loading, secretVerified]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
