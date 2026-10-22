import { useEffect, useState } from 'react';
import { Mail, Clock, CheckCircle, XCircle, RefreshCw, Ban, Copy } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { teamAccountsAction } from '@/lib/api';
import type { InvitationWithRelations } from '@/lib/types';
import { ROLE_LABELS, INVITATION_STATUS_LABELS, JOIN_CLASSIFICATION_LABELS, DEPARTMENT_LABELS } from '@/lib/types';
import { formatDate, relativeTime } from '@/lib/format';

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock,
  accepted: CheckCircle,
  expired: XCircle,
  suspended: Ban,
  deactivated: Ban,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gold-400 bg-gold-400/10',
  accepted: 'text-acid-400 bg-acid-400/10',
  expired: 'text-ink-400 bg-ink-800',
  suspended: 'text-synf-400 bg-synf-500/15',
  deactivated: 'text-synf-400 bg-synf-500/15',
};

export function AdminInvitations() {
  const { isStaff } = useAuth();
  const [invitations, setInvitations] = useState<InvitationWithRelations[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await teamAccountsAction({ action: 'list_invitations' });
    if (r.invitations) setInvitations(r.invitations as InvitationWithRelations[]);
    setLoading(false);
  }

  function showToast(type: 'ok' | 'err', msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); }

  async function revoke(id: string) {
    if (!confirm('Revoke this invitation?')) return;
    const r = await teamAccountsAction({ action: 'revoke_invitation', invitation_id: id });
    if (r.error) showToast('err', r.error);
    else { showToast('ok', 'Invitation revoked'); load(); }
  }

  async function resend(id: string) {
    const r = await teamAccountsAction({ action: 'resend_invitation', invitation_id: id });
    if (r.error) showToast('err', r.error);
    else {
      const token = r.setup_token as string;
      const link = `${window.location.origin}/admin/setup?token=${token}`;
      navigator.clipboard?.writeText(link);
      showToast('ok', 'Invitation resent. Link copied to clipboard.');
      load();
    }
  }

  const filtered = filter === 'all' ? invitations : invitations.filter(i => i.status === filter);
  const counts = {
    pending: invitations.filter(i => i.status === 'pending').length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
    expired: invitations.filter(i => i.status === 'expired').length,
  };

  if (!isStaff) return <div className="text-white/50">Staff access required.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Invitations</h1>
        <p className="text-white/50">Track and manage team member invitations.</p>
      </div>

      {toast && <div className={`rounded-lg border p-3 text-sm ${toast.type === 'ok' ? 'border-acid-400/30 bg-acid-400/10 text-acid-300' : 'border-synf-500/30 bg-synf-500/10 text-synf-300'}`}>{toast.msg}</div>}

      <div className="grid grid-cols-3 gap-3">
        {[{ k: 'pending', l: 'Pending' }, { k: 'accepted', l: 'Accepted' }, { k: 'expired', l: 'Expired' }].map(c => (
          <button key={c.k} onClick={() => setFilter(c.k)} className={`card p-4 text-left transition ${filter === c.k ? 'border-synf-500/40' : ''}`}>
            <div className="text-2xl font-extrabold">{counts[c.k as keyof typeof counts]}</div>
            <div className="mt-1 text-xs uppercase tracking-widest text-ink-500">{c.l}</div>
          </button>
        ))}
      </div>

      <button onClick={() => setFilter('all')} className={`text-sm ${filter === 'all' ? 'text-synf-300' : 'text-white/60 hover:text-white'}`}>Show all</button>

      {loading ? <div className="h-40 animate-pulse rounded-lg bg-ink-900" /> : filtered.length === 0 ? (
        <div className="card p-10 text-center"><Mail className="mx-auto h-10 w-10 text-ink-500" /><p className="mt-3 text-white/50">No invitations.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => {
            const Icon = STATUS_ICONS[inv.status || 'pending'] || Clock;
            const colors = STATUS_COLORS[inv.status || 'pending'] || STATUS_COLORS.pending;
            return (
              <div key={inv.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{inv.full_name || inv.email}</span>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${colors}`}><Icon size={10} /> {INVITATION_STATUS_LABELS[inv.status || 'pending']}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-500">
                    <span>{inv.email}</span>
                    <span>{ROLE_LABELS[inv.role_id || inv.role] || inv.role}</span>
                    {inv.department && <span>{inv.department.name}</span>}
                    {inv.join_classification && <span>{JOIN_CLASSIFICATION_LABELS[inv.join_classification.id] || inv.join_classification.display_name}</span>}
                    <span>Expires {relativeTime(inv.expires_at)}</span>
                    {inv.activated_at && <span>Accepted {formatDate(inv.activated_at)}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {inv.status === 'pending' && <button onClick={() => resend(inv.id)} className="btn-ghost text-xs"><RefreshCw size={12} /> Resend</button>}
                  {inv.status === 'pending' && <button onClick={() => revoke(inv.id)} className="btn-ghost text-xs text-synf-400"><Ban size={12} /> Revoke</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
