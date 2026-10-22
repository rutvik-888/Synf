import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminSignup } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { UserPlus, AlertCircle, Check, Info } from 'lucide-react';

export function AdminSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', fullName: '', inviteCode: '' });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(''); setOk('');
    const r = await adminSignup(form);
    if (r.error) { setLoading(false); setErr(r.error); return; }
    // Auto-login after signup
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setLoading(false);
    if (error) {
      setOk('Account created. Please sign in.');
      setTimeout(() => navigate('/admin/login'), 1500);
      return;
    }
    if (r.founder && r.default_secret) {
      setOk(`Founder account created! Your login secret code is "${r.default_secret}". You'll need it each time you log in. Change it in Security settings.`);
      setTimeout(() => navigate('/admin/login'), 4000);
    } else {
      navigate('/admin/login');
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-ink-950 px-6">
      <div className="absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-acid-400/10 blur-[120px]" />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-synf-500 font-display text-lg font-extrabold">S</span>
          <span className="font-display text-2xl font-extrabold tracking-tightest">SYNF</span>
        </Link>
        <div className="card p-6">
          <h1 className="font-display text-2xl font-extrabold">Create admin account</h1>
          <p className="mt-1 text-sm text-white/50">You need an invite code from an existing owner.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><label className="label">Full name</label><input className="input" required value={form.fullName} onChange={e => set('fullName', e.target.value)} /></div>
            <div><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label className="label">Password</label><input className="input" type="password" required minLength={8} placeholder="Min 8 characters" value={form.password} onChange={e => set('password', e.target.value)} /></div>
            <div><label className="label">Invite code</label><input className="input" required value={form.inviteCode} onChange={e => set('inviteCode', e.target.value)} placeholder="Provided by an owner" /></div>
            {err && <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> {err}</div>}
            {ok && <div className="flex items-center gap-2 rounded-lg border border-acid-400/30 bg-acid-400/10 p-3 text-sm text-acid-400"><Check size={16} /> {ok}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full"><UserPlus size={16} /> {loading ? 'Creating…' : 'Create account'}</button>
          </form>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/5 bg-ink-900/50 p-3 text-xs text-ink-500">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>The first account created becomes the Founder and gets full control. Subsequent signups start as Viewer and are upgraded by the founder. The invite code is validated server-side and never exposed in the browser.</span>
          </div>
          <p className="mt-4 text-center text-xs text-ink-500">Already have an account? <Link to="/admin/login" className="text-synf-400 hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
