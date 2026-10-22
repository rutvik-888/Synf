import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Inbox, UserSquare, Users, FileText, LogOut, Sparkles, Briefcase, Mail, Shield, Crown, Network, KeyRound, Settings, Camera, ShoppingBag, Megaphone, Palette, LayoutGrid, Store } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { CommandMenu } from '@/components/CommandMenu';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['founder', 'owner', 'co_founder', 'hr_manager', 'admin', 'department_head', 'event_manager', 'core_team_member', 'viewer'] },
  { to: '/admin/events', label: 'Events', icon: CalendarDays, roles: ['founder', 'owner', 'co_founder', 'admin', 'department_head', 'event_manager', 'viewer'] },
  { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase, roles: ['founder', 'owner', 'co_founder', 'hr_manager', 'admin'] },
  { to: '/admin/applications', label: 'Applications', icon: UserSquare, roles: ['founder', 'owner', 'co_founder', 'hr_manager', 'admin', 'event_manager'] },
  { to: '/admin/community', label: 'Community Wall', icon: Camera, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/goods', label: 'Goods', icon: ShoppingBag, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/shopify', label: 'Shopify', icon: Store, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/campaigns', label: 'Campaigns', icon: Megaphone, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/content-calendar', label: 'Content Calendar', icon: CalendarDays, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/brand-studio', label: 'Brand Studio', icon: Palette, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/site-sections', label: 'Site Sections', icon: LayoutGrid, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/templates', label: 'Templates', icon: Mail, roles: ['founder', 'owner', 'co_founder', 'admin', 'hr_manager'] },
  { to: '/admin/people', label: 'The Collective', icon: Users, roles: ['founder', 'owner', 'co_founder', 'admin', 'department_head', 'event_manager', 'viewer'] },
  { to: '/admin/team', label: 'Team', icon: Network, roles: ['founder', 'owner', 'co_founder', 'hr_manager', 'admin'] },
  { to: '/admin/roles', label: 'Roles & Permissions', icon: Shield, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/invitations', label: 'Invitations', icon: Mail, roles: ['founder', 'owner', 'co_founder', 'hr_manager', 'admin'] },
  { to: '/admin/security', label: 'Security', icon: KeyRound, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/founder', label: 'Founder & Ownership', icon: Crown, roles: ['founder'] },
  { to: '/admin/content', label: 'Content', icon: FileText, roles: ['founder', 'owner', 'co_founder', 'admin'] },
  { to: '/admin/contact-settings', label: 'Contact Settings', icon: Settings, roles: ['founder', 'owner', 'co_founder', 'admin'] },
];

export function AdminLayout() {
  const { user, loading, isStaff, signOut, role, profile, memberProfile, secretVerified } = useAuth();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);

  if (loading) return <div className="grid min-h-screen place-items-center bg-ink-950 text-white/50">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isStaff) return <Navigate to="/crew" replace />;
  if (!secretVerified) return <Navigate to="/admin/login" replace />;

  const items = NAV.filter(n => n.roles.includes(role || 'viewer'));

  async function logout() {
    await signOut();
    navigate('/admin/login');
  }

  const displayName = memberProfile?.display_name || memberProfile?.custom_title || profile?.full_name || user.email;
  const roleLabel = memberProfile?.role_definition?.display_name || role?.replace('_', ' ');

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/5 bg-ink-900/50 p-4 md:flex md:flex-col">
          <NavLink to="/admin" className="mb-8 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-synf-500 font-display text-lg font-extrabold">S</span>
            <div><div className="font-display text-lg font-extrabold tracking-tightest">SYNF</div><div className="text-[10px] uppercase tracking-widest text-ink-500">Control Room</div></div>
          </NavLink>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {items.map(n => {
              const Icon = n.icon;
              return (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-synf-500/15 text-synf-300' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                  <Icon size={16} /> {n.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="border-t border-white/5 pt-3">
            <div className="px-3 py-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-white">
                {memberProfile?.is_founder && <Crown size={12} className="text-gold-400" />}
                {displayName}
              </div>
              <div className="mt-0.5 capitalize text-ink-500">{roleLabel}</div>
            </div>
            <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-synf-400"><LogOut size={16} /> Sign out</button>
          </div>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-ink-950/85 px-5 backdrop-blur-xl md:px-8">
            <button onClick={() => setCmdOpen(true)} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/40 hover:border-synf-500/40 hover:text-white/70">
              <Sparkles size={14} /> Search / quick action <kbd className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <NavLink to="/" className="text-sm text-white/40 hover:text-synf-400">View site →</NavLink>
          </header>

          {/* Mobile nav */}
          <nav className="flex gap-1 overflow-x-auto border-b border-white/5 px-4 py-2 md:hidden">
            {items.map(n => {
              const Icon = n.icon;
              return <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${isActive ? 'bg-synf-500/15 text-synf-300' : 'text-white/60'}`}><Icon size={14} /> {n.label}</NavLink>;
            })}
            <button onClick={logout} className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-white/60"><LogOut size={14} /></button>
          </nav>

          <main className="p-5 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
