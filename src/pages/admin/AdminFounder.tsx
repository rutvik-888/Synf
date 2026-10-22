import { useEffect, useState } from 'react';
import { Crown, ArrowRight, AlertCircle, ShieldCheck, History, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { teamAccountsAction, rolesPermissionsAction } from '@/lib/api';
import type { TeamMemberProfileRow, OwnershipTransferHistoryRow, RoleDefinitionRow } from '@/lib/types';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types';
import { formatDate } from '@/lib/format';

export function AdminFounder() {
  const { user, memberProfile, isFounder } = useAuth();
  const [members, setMembers] = useState<TeamMemberProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleDefinitionRow[]>([]);
  const [history, setHistory] = useState<OwnershipTransferHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    if (!isFounder) return;
    (async () => {
      const mr = await teamAccountsAction({ action: 'list_members' });
      if (mr.members) setMembers(mr.members as TeamMemberProfileRow[]);
      const rr = await rolesPermissionsAction({ action: 'list_roles' });
      if (rr.roles) setRoles(rr.roles as RoleDefinitionRow[]);
      const fr = await rolesPermissionsAction({ action: 'get_founder_info' });
      if (fr.transfer_history) setHistory(fr.transfer_history as OwnershipTransferHistoryRow[]);
      setLoading(false);
    })();
  }, [isFounder]);

  function showToast(type: 'ok' | 'err', msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 5000); }

  if (!isFounder) return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Founder & Ownership</h1>
      <div className="card p-10 text-center">
        <Lock className="mx-auto h-10 w-10 text-ink-500" />
        <p className="mt-3 text-white/50">Only the current founder can access this page.</p>
      </div>
    </div>
  );

  const eligibleTargets = members.filter(m => m.account_status === 'active' && m.id !== user?.id && !m.is_founder);
  const currentFounder = members.find(m => m.is_founder);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Founder & Ownership</h1>
        <p className="text-white/50">Manage platform ownership and transfer foundership.</p>
      </div>

      {toast && <div className={`rounded-lg border p-3 text-sm ${toast.type === 'ok' ? 'border-acid-400/30 bg-acid-400/10 text-acid-300' : 'border-synf-500/30 bg-synf-500/10 text-synf-300'}`}>{toast.msg}</div>}

      {/* Current founder card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gold-400/15 text-gold-400"><Crown size={28} /></span>
          <div>
            <div className="text-xs uppercase tracking-widest text-gold-400">Current Founder</div>
            <h2 className="font-display text-2xl font-extrabold">{currentFounder?.full_name || memberProfile?.full_name || 'You'}</h2>
            <p className="text-sm text-white/50">{currentFounder?.custom_title || 'Founder & Owner'}</p>
          </div>
        </div>
      </div>

      {/* Transfer action */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-extrabold">Transfer Foundership</h2>
            <p className="text-sm text-white/50">Transfer full ownership to another active team member.</p>
          </div>
          <button onClick={() => setShowTransfer(true)} disabled={eligibleTargets.length === 0} className="btn-primary"><ArrowRight size={16} /> Transfer</button>
        </div>
        {eligibleTargets.length === 0 && <p className="mt-3 text-xs text-ink-500">No eligible members. The target must be an active team member who is not already the founder.</p>}
      </div>

      {/* Transfer history */}
      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold"><History size={16} className="text-synf-400" /> Ownership Transfer History</h2>
        {loading ? <div className="h-20 animate-pulse rounded-lg bg-ink-900" /> : history.length === 0 ? (
          <p className="text-sm text-ink-500">No ownership transfers have occurred.</p>
        ) : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="rounded-lg border border-white/5 bg-ink-900/50 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Transfer #{h.id.slice(0, 8)}</span>
                  <span className="text-xs text-ink-500">{formatDate(h.created_at)}</span>
                </div>
                <div className="mt-1 text-xs text-white/60">
                  From: {h.from_user_id.slice(0, 8)}… → To: {h.to_user_id.slice(0, 8)}…
                </div>
                {h.new_role_id && <div className="text-xs text-ink-500">New role assigned: {ROLE_LABELS[h.new_role_id] || h.new_role_id}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recovery guidance */}
      <div className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold"><ShieldCheck size={16} className="text-gold-400" /> Recovery & Support</h2>
        <div className="space-y-2 text-sm text-white/60">
          <p>If you lose access to your founder account:</p>
          <ol className="ml-4 list-decimal space-y-1 text-xs">
            <li>Contact Supabase support to recover your auth account via email verification.</li>
            <li>The founder record is stored in the database and can only be changed via the secure transfer process or direct database intervention by an authorized administrator.</li>
            <li>There is no public endpoint that can claim ownership. All transfers require the current founder's password confirmation.</li>
          </ol>
        </div>
      </div>

      {/* Transfer modal */}
      {showTransfer && (
        <TransferModal
          targets={eligibleTargets}
          roles={roles}
          onClose={() => setShowTransfer(false)}
          onDone={(msg) => { setShowTransfer(false); showToast('ok', msg); }}
          onError={(msg) => showToast('err', msg)}
        />
      )}
    </div>
  );
}

function TransferModal({ targets, roles, onClose, onDone, onError }: {
  targets: TeamMemberProfileRow[];
  roles: RoleDefinitionRow[];
  onClose: () => void;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [targetId, setTargetId] = useState('');
  const [newRole, setNewRole] = useState('co_founder');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const target = targets.find(t => t.id === targetId);

  async function submit() {
    if (!targetId) { onError('Select a target member'); return; }
    if (step === 'select') { setStep('confirm'); return; }
    if (!confirmPassword) { onError('Password confirmation required'); return; }
    setLoading(true);
    const r = await teamAccountsAction({ action: 'transfer_foundership', target_user_id: targetId, confirm_password: confirmPassword, new_role_for_old_founder: newRole });
    setLoading(false);
    if (r.error) { onError(r.error); setStep('select'); return; }
    onDone(r.message as string || 'Foundership transferred');
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md space-y-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gold-400/15 text-gold-400"><Crown size={20} /></span>
          <div><h2 className="font-display text-xl font-extrabold">Transfer Foundership</h2><p className="text-xs text-white/50">This grants full platform ownership.</p></div>
        </div>

        <div className="rounded-lg border border-gold-400/20 bg-gold-400/5 p-3 text-xs text-gold-400">
          <AlertCircle size={14} className="mb-1 inline" /> This is a high-impact, irreversible action. You will lose founder privileges.
        </div>

        {step === 'select' ? (
          <div className="space-y-3">
            <div>
              <label className="label">Select New Founder</label>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {targets.map(t => (
                  <button key={t.id} onClick={() => setTargetId(t.id)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${targetId === t.id ? 'border-gold-400/40 bg-gold-400/10' : 'border-white/5 hover:border-white/10'}`}>
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-synf-500/20 text-xs font-bold text-synf-300">{t.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
                    <div className="min-w-0 flex-1"><div className="font-semibold text-white">{t.full_name}</div><div className="text-xs text-ink-500">{ROLE_LABELS[t.role_id] || t.role_id}</div></div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Your New Role (after transfer)</label>
              <select className="input" value={newRole} onChange={e => setNewRole(e.target.value)}>
                {roles.filter(r => r.id !== 'founder').map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
              </select>
            </div>
            <button onClick={submit} disabled={!targetId} className="btn-primary w-full">Continue</button>
          </div>
        ) : (
          <div className="space-y-3">
            {target && (
              <div className="rounded-lg border border-white/10 bg-ink-900/50 p-3 text-sm">
                <div className="text-ink-500">Transferring to:</div>
                <div className="font-semibold text-white">{target.full_name}</div>
                <div className="text-xs text-ink-500">{target.id.slice(0, 8)}… · {ROLE_LABELS[target.role_id] || target.role_id}</div>
                <div className="mt-2 text-ink-500">You will become: {ROLE_LABELS[newRole] || newRole}</div>
              </div>
            )}
            <div><label className="label">Confirm Your Password</label><input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" autoFocus /></div>
            <button onClick={submit} disabled={loading || !confirmPassword} className="btn-primary w-full text-gold-400">{loading ? 'Transferring…' : 'Confirm Transfer'}</button>
            <button onClick={() => setStep('select')} className="w-full text-center text-xs text-ink-500 hover:text-white/70">← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
