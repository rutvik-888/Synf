import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { UserPlus, AlertCircle, Check, KeyRound } from 'lucide-react';
import { teamAccountsAction } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function AccountSetup() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (password.length < 8) { setErr('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setErr('Passwords do not match'); return; }
    setLoading(true);
    const r = await teamAccountsAction({ action: 'accept_invitation', setup_token: token, password, full_name: fullName });
    setLoading(false);
    if (r.error) { setErr(r.error); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="relative grid min-h-screen place-items-center bg-ink-950 px-6">
        <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-acid-400/10 blur-[120px]" />
        <div className="relative w-full max-w-sm">
          <div className="card p-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-acid-400/15 text-acid-400 mx-auto"><Check size={28} /></div>
            <h1 className="mt-4 font-display text-2xl font-extrabold">Account Activated</h1>
            <p className="mt-2 text-sm text-white/60">Your Team Synf account is ready. You can now sign in.</p>
            <button onClick={() => navigate('/admin/login')} className="btn-primary mt-6 w-full">Continue to Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-ink-950 px-6">
      <div className="absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-synf-500/15 blur-[120px]" />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-synf-500 font-display text-lg font-extrabold">S</span>
          <span className="font-display text-2xl font-extrabold tracking-tightest">SYNF</span>
        </Link>
        <div className="card p-6">
          <h1 className="font-display text-2xl font-extrabold">Set Up Your Account</h1>
          <p className="mt-1 text-sm text-white/50">Complete your Team Synf invitation by setting your name and password.</p>
          {!token && <div className="mt-4 flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> Invalid or missing setup token.</div>}
          {token && (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div><label className="label">Full Name</label><input className="input" required value={fullName} onChange={e => setFullName(e.target.value)} /></div>
              <div><label className="label">Password (min 8 characters)</label><input className="input" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></div>
              <div><label className="label">Confirm Password</label><input className="input" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
              {err && <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> {err}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full"><KeyRound size={16} /> {loading ? 'Activating…' : 'Activate Account'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
