import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { LogIn, AlertCircle, KeyRound, ShieldCheck } from 'lucide-react';

export function AdminLogin() {
  const { user, isStaff, secretVerified, loading, verifySecret } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [step, setStep] = useState<'credentials' | 'secret'>('credentials');
  const [err, setErr] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);

  useEffect(() => {
    if (user && isStaff && secretVerified && !loading) {
      navigate('/admin', { replace: true });
    }
  }, [user, isStaff, secretVerified, loading, navigate]);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoadingLocal(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoadingLocal(false);
    if (error) { setErr(error.message); return; }
    setStep('secret');
  }

  async function submitSecret(e: React.FormEvent) {
    e.preventDefault();
    setLoadingLocal(true); setErr('');
    const r = await verifySecret(secret);
    setLoadingLocal(false);
    if (!r.valid) {
      setErr(r.error || 'Invalid secret code');
      if (r.locked) setErr(r.error || 'Account locked due to too many attempts');
    }
    // On success, the useEffect above will navigate to /admin once secretVerified is true
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-ink-950 px-6">
      <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-synf-500/20 blur-[120px]" />
      <div className="absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-acid-400/10 blur-[120px]" />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-synf-500 font-display text-lg font-extrabold">S</span>
          <span className="font-display text-2xl font-extrabold tracking-tightest">SYNF</span>
        </Link>
        <div className="card p-6">
          {step === 'credentials' ? (
            <>
              <h1 className="font-display text-2xl font-extrabold">Control Room</h1>
              <p className="mt-1 text-sm text-white/50">Sign in to manage events, crew and more.</p>
              <form onSubmit={submitCredentials} className="mt-6 space-y-4">
                <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><label className="label">Password</label><input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                {err && <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> {err}</div>}
                <button type="submit" disabled={loadingLocal} className="btn-primary w-full"><LogIn size={16} /> {loadingLocal ? 'Signing in…' : 'Continue'}</button>
              </form>
              <p className="mt-4 text-center text-xs text-ink-500">First time? <Link to="/admin/signup" className="text-synf-400 hover:underline">Create an admin account</Link> with your invite code.</p>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-synf-500/20 text-synf-400"><ShieldCheck size={18} /></span>
                <div><h1 className="font-display text-xl font-extrabold">Secret Code</h1><p className="text-xs text-white/50">Enter the Team Synf login secret.</p></div>
              </div>
              <form onSubmit={submitSecret} className="space-y-4">
                <div><label className="label">Team Synf Secret Code</label><input className="input text-center text-lg tracking-widest" type="password" required value={secret} onChange={e => setSecret(e.target.value)} placeholder="••••••" autoFocus /></div>
                {err && <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> {err}</div>}
                <button type="submit" disabled={loadingLocal} className="btn-primary w-full"><KeyRound size={16} /> {loadingLocal ? 'Verifying…' : 'Enter Control Room'}</button>
                <button type="button" onClick={() => { setStep('credentials'); setErr(''); setSecret(''); }} className="w-full text-center text-xs text-ink-500 hover:text-white/70">← Back to login</button>
              </form>
              <p className="mt-4 text-center text-xs text-ink-500">The secret code is validated server-side. Repeated invalid attempts will be locked out.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
