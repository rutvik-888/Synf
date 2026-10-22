import { useEffect, useState, useRef } from 'react';
import { Search, Plus, Ban, CheckCircle, Pause, Mail, Phone, Building2, Crown, Shield, X, ChevronDown, Upload, Loader2, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { teamAccountsAction, rolesPermissionsAction } from '@/lib/api';
import type { TeamMemberProfileRow, RoleDefinitionRow, DepartmentRow, JoinClassificationRow } from '@/lib/types';
import { ROLE_LABELS, ROLE_COLORS, ACCOUNT_STATUS_LABELS, JOIN_CLASSIFICATION_LABELS, DEPARTMENT_GROUPS } from '@/lib/types';
import { formatDate, relativeTime } from '@/lib/format';
import { PortraitUploader } from '@/components/PortraitUploader';

export function AdminTeam() {
  const { user, memberProfile, isFounder, isAdminOrOwner } = useAuth();
  const [members, setMembers] = useState<TeamMemberProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleDefinitionRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [classifications, setClassifications] = useState<JoinClassificationRow[]>([]);
  const [q, setQ] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<TeamMemberProfileRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [mr, rr, dr, cr] = await Promise.all([
      teamAccountsAction({ action: 'list_members' }),
      rolesPermissionsAction({ action: 'list_roles' }),
      rolesPermissionsAction({ action: 'list_departments' }),
      rolesPermissionsAction({ action: 'list_join_classifications' }),
    ]);
    if (mr.members) setMembers(mr.members as TeamMemberProfileRow[]);
    if (rr.roles) setRoles(rr.roles as RoleDefinitionRow[]);
    if (dr.departments) setDepartments(dr.departments as DepartmentRow[]);
    if (cr.classifications) setClassifications(cr.classifications as JoinClassificationRow[]);
    setLoading(false);
  }

  const canCreate = isFounder || isAdminOrOwner;
  const canEdit = isFounder || isAdminOrOwner;

  const filtered = members.filter(m => {
    if (deptFilter !== 'all' && m.department_id !== deptFilter) return false;
    if (roleFilter !== 'all' && m.role_id !== roleFilter) return false;
    if (statusFilter !== 'all' && m.account_status !== statusFilter) return false;
    if (classFilter !== 'all' && m.join_classification_id !== classFilter) return false;
    if (q) {
      const s = `${m.full_name} ${m.display_name || ''} ${m.custom_title || ''} ${m.phone || ''}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSuspend(m: TeamMemberProfileRow) {
    if (!confirm(`Suspend ${m.full_name}? They will lose access immediately.`)) return;
    const r = await teamAccountsAction({ action: 'suspend', member_id: m.id });
    if (r.error) showToast('err', r.error);
    else { showToast('ok', 'Member suspended'); loadAll(); setSel(null); }
  }

  async function handleReactivate(m: TeamMemberProfileRow) {
    const r = await teamAccountsAction({ action: 'reactivate', member_id: m.id });
    if (r.error) showToast('err', r.error);
    else { showToast('ok', 'Member reactivated'); loadAll(); setSel(null); }
  }

  async function handleDeactivate(m: TeamMemberProfileRow) {
    if (!confirm(`Deactivate ${m.full_name}? This is a stronger action than suspension. They cannot be reactivated easily.`)) return;
    const r = await teamAccountsAction({ action: 'deactivate', member_id: m.id });
    if (r.error) showToast('err', r.error);
    else { showToast('ok', 'Member deactivated'); loadAll(); setSel(null); }
  }

  async function handleChangeRole(m: TeamMemberProfileRow, newRoleId: string) {
    const r = await teamAccountsAction({ action: 'change_role', member_id: m.id, new_role_id: newRoleId });
    if (r.error) showToast('err', r.error);
    else { showToast('ok', 'Role updated'); loadAll(); }
  }

  const myRoleDef = roles.find(r => r.id === memberProfile?.role_id);
  const assignableRoles = isFounder ? roles.filter(r => r.id !== 'founder') : (myRoleDef?.can_assign_roles || []).map(id => roles.find(r => r.id === id)).filter(Boolean) as RoleDefinitionRow[];

  if (!canCreate && !canEdit) return <div className="text-white/50">You need team management permissions to view this page.</div>;

  // Group departments by group_label for dropdowns
  const groupedDepts = DEPARTMENT_GROUPS.map(group => ({
    group,
    items: departments.filter(d => d.group_label === group).sort((a, b) => a.sort_order - b.sort_order),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Team Accounts</h1>
          <p className="text-white/50">Create, manage, and assign roles to team members.</p>
        </div>
        {canCreate && <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> Create / Invite</button>}
      </div>

      {toast && <div className={`rounded-lg border p-3 text-sm ${toast.type === 'ok' ? 'border-acid-400/30 bg-acid-400/10 text-acid-300' : 'border-synf-500/30 bg-synf-500/10 text-synf-300'}`}>{toast.msg}</div>}

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" /><input className="input pl-9" placeholder="Search members…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="input lg:w-44" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="all">All departments</option>
          {groupedDepts.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select className="input lg:w-40" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
        </select>
        <select className="input lg:w-36" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="all">All classifications</option>
          {classifications.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
        </select>
        <select className="input lg:w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(ACCOUNT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Members grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-ink-900" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center"><p className="text-white/50">No members match your filters.</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(m => {
            const colors = ROLE_COLORS[m.role_id] || ROLE_COLORS.viewer;
            return (
              <button key={m.id} onClick={() => setSel(m)} className={`card text-left p-5 transition hover:border-synf-500/40 ${colors.shadow}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.full_name} className={`h-12 w-12 rounded-full border-2 ${colors.border} object-cover`} />
                    ) : (
                      <div className={`grid h-12 w-12 place-items-center rounded-full border-2 ${colors.border} ${colors.bg} font-display text-lg font-bold ${colors.text}`}>
                        {m.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 font-display font-bold text-white">
                        {m.is_founder && <Crown size={14} className="text-gold-400" />}
                        {m.full_name}
                      </div>
                      {m.custom_title && <div className="text-xs text-white/60">{m.custom_title}</div>}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${m.account_status === 'active' ? 'bg-acid-400/10 text-acid-400' : m.account_status === 'suspended' ? 'bg-gold-400/10 text-gold-400' : 'bg-synf-500/15 text-synf-400'}`}>{ACCOUNT_STATUS_LABELS[m.account_status]}</span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-white/50">
                  <div className={`font-semibold ${colors.text}`}>{ROLE_LABELS[m.role_id] || m.role_id}</div>
                  {m.department && <div className="flex items-center gap-1"><Building2 size={11} /> {m.department.name}</div>}
                  {m.join_classification && <div>{JOIN_CLASSIFICATION_LABELS[m.join_classification.id] || m.join_classification.display_name}</div>}
                  {m.last_login_at && <div>Last login: {relativeTime(m.last_login_at)}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Member detail / edit modal */}
      {sel && (
        <MemberDetailModal
          member={sel}
          roles={roles}
          groupedDepts={groupedDepts}
          classifications={classifications}
          members={members}
          assignableRoles={assignableRoles}
          canEdit={canEdit}
          isSelf={sel.user_id === user?.id}
          onClose={() => setSel(null)}
          onUpdate={() => { loadAll(); setSel(null); }}
          onAction={async (action, payload) => {
            const r = await teamAccountsAction({ action, ...payload });
            if (r.error) { showToast('err', r.error); return false; }
            showToast('ok', 'Updated'); return true;
          }}
          onSuspend={() => handleSuspend(sel)}
          onReactivate={() => handleReactivate(sel)}
          onDeactivate={() => handleDeactivate(sel)}
          onChangeRole={(rid) => handleChangeRole(sel, rid)}
        />
      )}

      {/* Create / Invite modal */}
      {showCreate && (
        <CreateMemberModal
          roles={assignableRoles}
          groupedDepts={groupedDepts}
          classifications={classifications}
          members={members}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadAll(); showToast('ok', 'Invitation created'); }}
          onError={(msg) => showToast('err', msg)}
        />
      )}
    </div>
  );
}

// ============================================================
// Member Detail Modal with portrait upload + editable fields
// ============================================================
function MemberDetailModal({ member, roles, groupedDepts, classifications, members, assignableRoles, canEdit, isSelf, onClose, onUpdate, onAction, onSuspend, onReactivate, onDeactivate, onChangeRole }: {
  member: TeamMemberProfileRow;
  roles: RoleDefinitionRow[];
  groupedDepts: { group: string; items: DepartmentRow[] }[];
  classifications: JoinClassificationRow[];
  members: TeamMemberProfileRow[];
  assignableRoles: RoleDefinitionRow[];
  canEdit: boolean;
  isSelf: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<boolean>;
  onSuspend: () => void;
  onReactivate: () => void;
  onDeactivate: () => void;
  onChangeRole: (roleId: string) => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(member.avatar_url);
  const [form, setForm] = useState({
    custom_title: member.custom_title || '',
    phone: member.phone || '',
    department_id: member.department_id || '',
    bio: member.bio || '',
    instagram_url: member.instagram_url || '',
    display_name: member.display_name || '',
    join_classification_id: member.join_classification_id || '',
    reporting_manager_id: member.reporting_manager_id || '',
  });
  const colors = ROLE_COLORS[member.role_id] || ROLE_COLORS.viewer;

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function saveEdits() {
    const ok = await onAction('update_member', { member_id: member.id, ...form });
    if (ok) { setEditing(false); onUpdate(); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] space-y-4 overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Portrait with full uploader (click, drag-drop, URL) */}
            <PortraitUploader
              name={member.full_name}
              url={avatarUrl}
              canEdit={canEdit || isSelf}
              onUploaded={async (publicUrl) => {
                const ok = await onAction('update_member', { member_id: member.id, avatar_url: publicUrl });
                if (ok) setAvatarUrl(publicUrl);
                return ok;
              }}
              onRemoved={async () => {
                const ok = await onAction('update_member', { member_id: member.id, avatar_url: null });
                if (ok) setAvatarUrl(null);
                return ok;
              }}
            />
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">{member.is_founder && <Crown size={16} className="text-gold-400" />}{member.full_name}</h2>
              {member.custom_title && <p className="text-sm text-white/60">{member.custom_title}</p>}
              <p className="text-xs text-ink-500">Added {formatDate(member.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
        </div>

        {editing ? (
          /* ---- Edit mode ---- */
          <div className="space-y-4">
            {/* Personal info */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-synf-400">Personal Info</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Display Name</label><input className="input" value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="Public name" /></div>
                <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
                <div><label className="label">Instagram URL</label><input className="input" value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="https://instagram.com/…" /></div>
                <div><label className="label">Custom Title</label><input className="input" value={form.custom_title} onChange={e => set('custom_title', e.target.value)} placeholder="e.g. Creative Director" /></div>
              </div>
              <div className="mt-3"><label className="label">Bio</label><textarea className="input min-h-[80px]" value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Short bio shown on the People page" /></div>
            </div>

            {/* Team placement */}
            {canEdit && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-synf-400">Team Placement</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Department</label>
                    <select className="input" value={form.department_id} onChange={e => set('department_id', e.target.value)}>
                      <option value="">—</option>
                      {groupedDepts.map(g => (
                        <optgroup key={g.group} label={g.group}>
                          {g.items.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Join Classification</label>
                    <select className="input" value={form.join_classification_id} onChange={e => set('join_classification_id', e.target.value)}>
                      <option value="">—</option>
                      {classifications.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Reporting Manager</label>
                    <select className="input" value={form.reporting_manager_id} onChange={e => set('reporting_manager_id', e.target.value)}>
                      <option value="">—</option>
                      {members.filter(m => m.account_status === 'active' && m.id !== member.id).map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 border-t border-white/5 pt-4">
              <button onClick={saveEdits} className="btn-primary">Save changes</button>
              <button onClick={() => { setEditing(false); setAvatarUrl(member.avatar_url); }} className="btn-ghost">Cancel</button>
            </div>
          </div>
        ) : (
          /* ---- View mode ---- */
          <div className="space-y-3">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div><span className="text-ink-500">Role</span>
                {canEdit && !member.is_founder && member.id !== user?.id ? (
                  <select className="input mt-1" value={member.role_id} onChange={e => onChangeRole(e.target.value)}>
                    {assignableRoles.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                  </select>
                ) : <div className="font-semibold text-white">{ROLE_LABELS[member.role_id] || member.role_id}</div>}
              </div>
              <div><span className="text-ink-500">Department</span><div className="font-semibold text-white">{member.department?.name || '—'}</div></div>
              <div><span className="text-ink-500">Classification</span><div className="font-semibold text-white">{member.join_classification ? JOIN_CLASSIFICATION_LABELS[member.join_classification.id] || member.join_classification.display_name : '—'}</div></div>
              <div><span className="text-ink-500">Status</span><div className="font-semibold text-white">{ACCOUNT_STATUS_LABELS[member.account_status]}</div></div>
              {member.phone && <div className="flex items-center gap-1"><Phone size={12} className="text-ink-500" /> {member.phone}</div>}
              {member.bio && <div className="sm:col-span-2"><span className="text-ink-500">Bio</span><div className="text-white/80">{member.bio}</div></div>}
              {member.manager && <div className="sm:col-span-2"><span className="text-ink-500">Reporting Manager</span><div className="text-white">{member.manager.full_name}</div></div>}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
              {(canEdit || isSelf) && <button onClick={() => setEditing(true)} className="btn-ghost"><User size={14} /> Edit profile</button>}
              {canEdit && !member.is_founder && member.id !== user?.id && (
                <>
                  {member.account_status === 'active' && <button onClick={onSuspend} className="btn-ghost text-gold-400"><Pause size={14} /> Suspend</button>}
                  {member.account_status === 'suspended' && <button onClick={onReactivate} className="btn-ghost text-acid-400"><CheckCircle size={14} /> Reactivate</button>}
                  {member.account_status !== 'deactivated' && <button onClick={onDeactivate} className="btn-ghost text-synf-400"><Ban size={14} /> Deactivate</button>}
                </>
              )}
            </div>
            {member.is_founder && <p className="rounded-lg border border-gold-400/20 bg-gold-400/5 p-3 text-xs text-gold-400">This is the founder account. It cannot be suspended, deactivated, or have its role changed except through the ownership transfer process.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Create Member Modal with grouped departments + improved sections
// ============================================================
function CreateMemberModal({ roles, groupedDepts, classifications, members, onClose, onCreated, onError }: {
  roles: RoleDefinitionRow[];
  groupedDepts: { group: string; items: DepartmentRow[] }[];
  classifications: JoinClassificationRow[];
  members: TeamMemberProfileRow[];
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [mode, setMode] = useState<'invite' | 'create'>('invite');
  const [form, setForm] = useState({
    email: '', full_name: '', phone: '', department_id: '', role_id: '',
    custom_title: '', join_classification_id: 'direct_appointment',
    reporting_manager_id: '', how_joined: 'direct_appointment', temp_password: '',
    bio: '', instagram_url: '', display_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ setup_token?: string; message?: string } | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.full_name || !form.role_id) { onError('Email, name, and role are required'); return; }
    setLoading(true);
    const action = mode === 'invite' ? 'invite_member' : 'create_account';
    const r = await teamAccountsAction({ action, ...form });
    setLoading(false);
    if (r.error) { onError(r.error); return; }
    if (r.setup_token) {
      setResult({ setup_token: r.setup_token as string, message: r.message as string });
    } else {
      onCreated();
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="card w-full max-w-md space-y-4 p-6" onClick={e => e.stopPropagation()}>
          <div className="grid h-14 w-14 place-items-center rounded-full bg-acid-400/15 text-acid-400"><CheckCircle size={28} /></div>
          <h2 className="font-display text-xl font-extrabold">Invitation Created</h2>
          <p className="text-sm text-white/60">{result.message}</p>
          <div>
            <label className="label">Setup Link (share with the invitee)</label>
            <div className="flex gap-2">
              <input className="input flex-1 font-mono text-xs" readOnly value={`${window.location.origin}/admin/setup?token=${result.setup_token}`} />
              <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/admin/setup?token=${result.setup_token}`); }} className="btn-ghost">Copy</button>
            </div>
          </div>
          <p className="text-xs text-ink-500">This link expires in 7 days. The invitee will set their own password.</p>
          <button onClick={onCreated} className="btn-primary w-full">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] space-y-4 overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">Create Team Account</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex gap-2 rounded-lg border border-white/5 bg-ink-900/50 p-1">
          <button onClick={() => setMode('invite')} className={`flex-1 rounded-md px-3 py-2 text-sm transition ${mode === 'invite' ? 'bg-synf-500/20 text-synf-300' : 'text-white/60'}`}><Mail size={14} className="mr-2 inline" /> Invite by email (member sets password)</button>
          <button onClick={() => setMode('create')} className={`flex-1 rounded-md px-3 py-2 text-sm transition ${mode === 'create' ? 'bg-synf-500/20 text-synf-300' : 'text-white/60'}`}><Plus size={14} className="mr-2 inline" /> Create with temp password</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Personal Info */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-synf-400">Personal Info</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Full Name *</label><input className="input" required value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
              <div><label className="label">Email *</label><input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></div>
              <div><label className="label">Display Name</label><input className="input" value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="Public name (optional)" /></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="label">Instagram URL</label><input className="input" value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="https://instagram.com/…" /></div>
              <div className="sm:col-span-2"><label className="label">Bio</label><textarea className="input min-h-[60px]" value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Short bio for the People page (optional)" /></div>
            </div>
          </div>

          {/* Team Placement */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-synf-400">Team Placement</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Role *</label><select className="input" required value={form.role_id} onChange={e => set('role_id', e.target.value)}><option value="">Select role…</option>{roles.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}</select></div>
              <div><label className="label">Custom Title</label><input className="input" value={form.custom_title} onChange={e => set('custom_title', e.target.value)} placeholder="e.g. Creative Director" /></div>
              <div>
                <label className="label">Department</label>
                <select className="input" value={form.department_id} onChange={e => set('department_id', e.target.value)}>
                  <option value="">—</option>
                  {groupedDepts.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div><label className="label">Join Classification</label><select className="input" value={form.join_classification_id} onChange={e => { set('join_classification_id', e.target.value); set('how_joined', e.target.value); }}>{classifications.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}</select></div>
              <div className="sm:col-span-2"><label className="label">Reporting Manager</label><select className="input" value={form.reporting_manager_id} onChange={e => set('reporting_manager_id', e.target.value)}><option value="">—</option>{members.filter(m => m.account_status === 'active').map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
            </div>
          </div>

          {/* Access */}
          {mode === 'create' && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-synf-400">Access</h3>
              <div><label className="label">Temporary Password</label><input className="input" type="text" value={form.temp_password} onChange={e => set('temp_password', e.target.value)} placeholder="Leave blank to auto-generate. Member must change at first login." /><p className="mt-1 text-xs text-ink-500">The password is never shown to you after creation. The member must change it at first login.</p></div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating…' : mode === 'invite' ? 'Send Invitation' : 'Create Account'}</button>
        </form>
      </div>
    </div>
  );
}
