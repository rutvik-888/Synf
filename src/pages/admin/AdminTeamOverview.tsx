import { useEffect, useState } from 'react';
import { Users, Clock, Ban, Crown, Network, Activity, ShieldCheck, Mail, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { teamAccountsAction } from '@/lib/api';
import type { TeamMemberProfileRow, InvitationWithRelations } from '@/lib/types';
import { ROLE_LABELS, ROLE_COLORS, ACCOUNT_STATUS_LABELS } from '@/lib/types';
import { relativeTime } from '@/lib/format';

export function AdminTeamOverview() {
  const { isStaff } = useAuth();
  const [members, setMembers] = useState<TeamMemberProfileRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStaff) return;
    (async () => {
      const r = await teamAccountsAction({ action: 'list_members' });
      if (r.members) setMembers(r.members as TeamMemberProfileRow[]);
      const ri = await teamAccountsAction({ action: 'list_invitations' });
      if (ri.invitations) setInvitations(ri.invitations as InvitationWithRelations[]);
      setLoading(false);
    })();
  }, [isStaff]);

  const active = members.filter(m => m.account_status === 'active');
  const suspended = members.filter(m => m.account_status === 'suspended');
  const pendingInvites = invitations.filter(i => i.status === 'pending');
  const roleDist: Record<string, number> = {};
  members.forEach(m => { roleDist[m.role_id] = (roleDist[m.role_id] || 0) + 1; });

  const recentActivity = members
    .filter(m => m.last_login_at)
    .sort((a, b) => new Date(b.last_login_at!).getTime() - new Date(a.last_login_at!).getTime())
    .slice(0, 5);

  if (!isStaff) return <div className="text-white/50">Staff access required.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Team Overview</h1>
        <p className="text-white/50">At-a-glance snapshot of your team.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Active Members" value={active.length} color="text-acid-400" />
        <StatCard icon={Clock} label="Pending Invitations" value={pendingInvites.length} color="text-gold-400" to="/admin/invitations" />
        <StatCard icon={Ban} label="Suspended" value={suspended.length} color="text-synf-400" />
        <StatCard icon={Crown} label="Founders" value={members.filter(m => m.is_founder).length} color="text-gold-400" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Role distribution */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold"><Network size={16} className="text-synf-400" /> Role Distribution</h2>
          {loading ? <div className="h-32 animate-pulse rounded-lg bg-ink-900" /> : Object.keys(roleDist).length === 0 ? (
            <p className="text-sm text-ink-500">No members yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(roleDist).sort((a, b) => b[1] - a[1]).map(([roleId, count]) => {
                const colors = ROLE_COLORS[roleId] || ROLE_COLORS.viewer;
                return (
                  <div key={roleId} className="flex items-center justify-between rounded-lg border border-white/5 bg-ink-900/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${colors.bg}`} />
                      <span className="text-sm text-white/80">{ROLE_LABELS[roleId] || roleId}</span>
                    </div>
                    <span className="font-display text-lg font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold"><Activity size={16} className="text-synf-400" /> Recent Logins</h2>
          {recentActivity.length === 0 ? <p className="text-sm text-ink-500">No recent logins.</p> : (
            <ul className="space-y-2">
              {recentActivity.map(m => (
                <li key={m.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-ink-900/50 px-3 py-2 text-sm">
                  <div><span className="font-semibold text-white">{m.full_name}</span><span className="ml-2 text-xs text-ink-500">{ROLE_LABELS[m.role_id] || m.role_id}</span></div>
                  <span className="text-xs text-ink-500">{relativeTime(m.last_login_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Pending invitations */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold"><Mail size={16} className="text-synf-400" /> Pending Invitations</h2>
          <Link to="/admin/team" className="btn-ghost text-sm"><UserPlus size={14} /> Invite member</Link>
        </div>
        {pendingInvites.length === 0 ? <p className="text-sm text-ink-500">No pending invitations.</p> : (
          <div className="space-y-2">
            {pendingInvites.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-ink-900/50 px-3 py-2 text-sm">
                <div><span className="font-semibold text-white">{inv.full_name || inv.email}</span><span className="ml-2 text-xs text-ink-500">{inv.email}</span></div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-500">{ROLE_LABELS[inv.role_id || inv.role] || inv.role}</span>
                  <span className="text-xs text-gold-400">Expires {relativeTime(inv.expires_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/team" className="btn-primary"><UserPlus size={16} /> Manage Team</Link>
        <Link to="/admin/roles" className="btn-ghost"><ShieldCheck size={16} /> Roles & Permissions</Link>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, to }: { icon: React.ElementType; label: string; value: number; color: string; to?: string }) {
  const inner = (
    <div className="card group p-5 transition hover:border-synf-500/40">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-ink-500">{label}</span>
        <Icon size={18} className={color} />
      </div>
      <div className={`mt-2 font-display text-4xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
