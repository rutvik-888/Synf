import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, RotateCcw, Ban, AlertCircle, Activity, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { loginSecretAction, rolesPermissionsAction } from '@/lib/api';
import type { SecurityEventRow } from '@/lib/types';

export function AdminSecurity() {
  const { isFounder, memberProfile } = useAuth();
  const [secretStatus, setSecretStatus] = useState<{ configured: boolean; version: number; last_rotated: string | null } | null>(null);
  const [events, setEvents] = useState<SecurityEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRotate, setShowRotate] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const canView = isFounder || memberProfile?.role_id === 'co_founder' || memberProfile?.role_id === 'admin';

  useEffect(() => {
    if (!canView) return;
    (async () => {
      const sr = await loginSecretAction({ action: 'get_status' });
      if (!sr.error) setSecretStatus(sr as { configured: boolean; version: number; last_rotated: string | null });
      const er = await rolesPermissionsAction({ action: 'get_security_events', limit: 50 });
      if (er.events) setEvents(er.events as SecurityEventRow[]);
      setLoading(false);
    })();
  }, [canView]);

  function showToast(type: 'ok' | 'err', msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); }

  if (!canView) return <div className="text-white/50">Admin access required to view security settings.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Security Settings</h1>
        <p className="text-white/50">Login secret rotation, session management, and security event logs.</p>
      </div>

      {toast && <div className={`rounded-lg border p-3 text-sm ${toast.type === 'ok' ? 'border-acid-400/30 bg-acid-400/10 text-acid-300' : 'border-synf-500/30 bg-synf-500/10 text-synf-300'}`}>{toast.msg}</div>}

      {/* Login secret status */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-synf-500/15 text-synf-400"><KeyRound size={20} /></span>
            <div>
              <h2 className="font-display text-lg font-extrabold">Login Secret Code</h2>
              <p className="text-sm text-white/50">{secretStatus?.configured ? `Version ${secretStatus.version} · Last rotated ${secretStatus.last_rotated ? new Date(secretStatus.last_rotated).toLocaleDateString() : 'never'}` : 'Not configured'}</p>
            </div>
          </div>
          {isFounder && (
            <button onClick={() => setShowRotate(true)} className="btn-primary"><RotateCcw size={16} /> Rotate Secret</button>
          )}
        </div>
        {!secretStatus?.configured && isFounder && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-gold-400/20 bg-gold-400/5 p-3 text-sm text-gold-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>The login secret is not yet configured. Members cannot access the admin dashboard without it. Rotate the secret to set one.</span>
          </div>
        )}
        <div className="mt-4 space-y-2 text-xs text-ink-500">
          <div className="flex items-center gap-2"><ShieldCheck size={12} className="text-acid-400" /> The secret hash is stored server-side and never sent to the browser.</div>
          <div className="flex items-center gap-2"><Lock size={12} className="text-acid-400" /> Repeated invalid attempts are rate-limited with automatic lockout.</div>
          <div className="flex items-center gap-2"><Activity size={12} className="text-acid-400" /> All secret attempts are logged for security auditing.</div>
        </div>
      </div>

      {/* Security events */}
      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold"><Activity size={16} className="text-synf-400" /> Security Event Log</h2>
        {loading ? <div className="h-32 animate-pulse rounded-lg bg-ink-900" /> : events.length === 0 ? (
          <p className="text-sm text-ink-500">No security events recorded.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map(e => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-ink-900/50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${e.success ? 'bg-acid-400' : 'bg-synf-400'}`} />
                  <span className="font-semibold text-white">{e.event_type.replace(/_/g, ' ')}</span>
                  {e.user_id && <span className="text-xs text-ink-500">user: {e.user_id.slice(0, 8)}…</span>}
                </div>
                <span className="text-xs text-ink-500">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rotate secret modal */}
      {showRotate && isFounder && (
        <RotateSecretModal onClose={() => setShowRotate(false)} onDone={() => { setShowRotate(false); showToast('ok', 'Secret rotated successfully'); }} onError={(msg) => showToast('err', msg)} />
      )}
    </div>
  );
}

function RotateSecretModal({ onClose, onDone, onError }: { onClose: () => void; onDone: () => void; onError: (msg: string) => void }) {
  const [newSecret, setNewSecret] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newSecret.length < 6) { onError('Secret must be at least 6 characters'); return; }
    if (!confirmPassword) { onError('Password confirmation required'); return; }
    setLoading(true);
    const r = await loginSecretAction({ action: 'rotate_secret', new_secret: newSecret, confirm_password: confirmPassword });
    setLoading(false);
    if (r.error) { onError(r.error); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md space-y-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gold-400/15 text-gold-400"><RotateCcw size={20} /></span>
          <div><h2 className="font-display text-xl font-extrabold">Rotate Login Secret</h2><p className="text-xs text-white/50">All members will need the new code for their next login.</p></div>
        </div>
        <div className="rounded-lg border border-gold-400/20 bg-gold-400/5 p-3 text-xs text-gold-400">
          <AlertCircle size={14} className="mb-1 inline" /> This is a high-impact action. Active sessions are not immediately terminated, but all members must use the new secret on their next login.
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">New Secret Code (min 6 characters)</label><input className="input text-center text-lg tracking-widest" type="password" value={newSecret} onChange={e => setNewSecret(e.target.value)} autoFocus /></div>
          <div><label className="label">Confirm Your Password</label><input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password to confirm" /></div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Rotating…' : 'Rotate Secret'}</button>
        </form>
      </div>
    </div>
  );
}
