import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Calendar, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function CrewLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="grid min-h-screen place-items-center bg-ink-950 text-white/50">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  async function logout() { await signOut(); navigate('/admin/login'); }

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-ink-950/85 px-5 backdrop-blur-xl">
        <NavLink to="/crew" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-synf-500 font-display text-sm font-extrabold">S</span>
          <div><div className="font-display text-base font-extrabold tracking-tightest">SYNF Crew</div></div>
        </NavLink>
        <button onClick={logout} className="flex items-center gap-2 text-sm text-white/50 hover:text-synf-400"><LogOut size={16} /> Sign out</button>
      </header>
      <main className="p-5 md:p-8"><Outlet /></main>
    </div>
  );
}
