import { useEffect, useState } from 'react';
import { Shield, Plus, X, Save, Trash2, ChevronRight, Crown, Network } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { rolesPermissionsAction } from '@/lib/api';
import type { RoleDefinitionRow, RolePermissionRow, DepartmentRow } from '@/lib/types';
import { PERMISSION_MODULES, PERMISSION_ACTIONS, MODULE_LABELS, ACTION_LABELS, ROLE_COLORS } from '@/lib/types';

export function AdminRoles() {
  const { isFounder, memberProfile } = useAuth();
  const [roles, setRoles] = useState<RoleDefinitionRow[]>([]);
  const [selRole, setSelRole] = useState<RoleDefinitionRow | null>(null);
  const [permissions, setPermissions] = useState<RolePermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    const r = await rolesPermissionsAction({ action: 'list_roles' });
    if (r.roles) setRoles(r.roles as RoleDefinitionRow[]);
    setLoading(false);
  }

  async function loadPermissions(roleId: string) {
    const r = await rolesPermissionsAction({ action: 'get_permissions', role_id: roleId });
    if (r.permissions) setPermissions(r.permissions as RolePermissionRow[]);
  }

  function selectRole(role: RoleDefinitionRow) {
    setSelRole(role);
    loadPermissions(role.id);
  }

  function showToast(type: 'ok' | 'err', msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); }

  function togglePerm(module: string, action: string, allowed: boolean) {
    setPermissions(prev => {
      const idx = prev.findIndex(p => p.module === module && p.action === action);
      if (idx >= 0) {
        const copy = [...prev]; copy[idx] = { ...copy[idx], allowed }; return copy;
      }
      return [...prev, { role_id: selRole!.id, module, action, allowed }];
    });
  }

  async function savePermissions() {
    if (!selRole) return;
    const r = await rolesPermissionsAction({ action: 'update_permissions', role_id: selRole.id, permissions });
    if (r.error) showToast('err', r.error);
    else showToast('ok', 'Permissions saved');
  }

  async function updateRole(field: string, value: unknown) {
    if (!selRole) return;
    const r = await rolesPermissionsAction({ action: 'update_role', id: selRole.id, [field]: value });
    if (r.error) showToast('err', r.error);
    else { showToast('ok', 'Role updated'); loadRoles(); }
  }

  async function deleteRole(role: RoleDefinitionRow) {
    if (!confirm(`Delete role "${role.display_name}"? This cannot be undone.`)) return;
    const r = await rolesPermissionsAction({ action: 'delete_role', id: role.id });
    if (r.error) showToast('err', r.error);
    else { showToast('ok', 'Role deleted'); loadRoles(); setSelRole(null); }
  }

  const canManage = isFounder || memberProfile?.role_id === 'co_founder' || memberProfile?.role_id === 'admin';

  if (!canManage) return <div className="text-white/50">You need permission to manage roles.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Roles & Permissions</h1>
          <p className="text-white/50">Configure the hierarchy, rename roles, and set granular permissions.</p>
        </div>
        {isFounder && <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New Role</button>}
      </div>

      {toast && <div className={`rounded-lg border p-3 text-sm ${toast.type === 'ok' ? 'border-acid-400/30 bg-acid-400/10 text-acid-300' : 'border-synf-500/30 bg-synf-500/10 text-synf-300'}`}>{toast.msg}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Role list */}
        <div className="space-y-2">
          {loading ? <div className="h-40 animate-pulse rounded-lg bg-ink-900" /> : roles.map(r => {
            const colors = ROLE_COLORS[r.id] || ROLE_COLORS.viewer;
            return (
              <button key={r.id} onClick={() => selectRole(r)} className={`w-full rounded-lg border p-3 text-left transition ${selRole?.id === r.id ? 'border-synf-500/40 bg-synf-500/10' : 'border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {r.id === 'founder' && <Crown size={14} className="text-gold-400" />}
                    <span className="font-display font-bold text-white">{r.display_name}</span>
                  </div>
                  <span className="text-xs text-ink-500">L{r.hierarchy_level}</span>
                </div>
                {r.description && <p className="mt-1 text-xs text-white/50">{r.description}</p>}
                <div className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${colors.bg} ${colors.text}`}>{r.is_system ? 'System' : 'Custom'}</div>
              </button>
            );
          })}
        </div>

        {/* Role detail + permissions matrix */}
        <div className="lg:col-span-2 space-y-4">
          {selRole ? (
            <>
              <div className="card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-extrabold">{selRole.display_name}</h2>
                  {!selRole.is_system && isFounder && <button onClick={() => deleteRole(selRole)} className="btn-ghost text-synf-400"><Trash2 size={14} /></button>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label">Display Name</label><input className="input" defaultValue={selRole.display_name} onBlur={e => { if (e.target.value !== selRole.display_name) updateRole('display_name', e.target.value); }} /></div>
                  <div><label className="label">Hierarchy Level (0 = highest)</label><input className="input" type="number" defaultValue={selRole.hierarchy_level} onBlur={e => { if (parseInt(e.target.value) !== selRole.hierarchy_level) updateRole('hierarchy_level', parseInt(e.target.value)); }} /></div>
                </div>
                <div><label className="label">Description</label><textarea className="input min-h-[60px]" defaultValue={selRole.description || ''} onBlur={e => { if (e.target.value !== selRole.description) updateRole('description', e.target.value); }} /></div>
                <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" className="accent-synf-500" checked={selRole.is_active} onChange={e => updateRole('is_active', e.target.checked)} disabled={selRole.id === 'founder'} /> Active</label>
              </div>

              {/* Permissions matrix */}
              <div className="card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-extrabold">Permissions Matrix</h3>
                  <button onClick={savePermissions} className="btn-primary"><Save size={14} /> Save Permissions</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-widest text-ink-500">
                      <th className="p-2">Module</th>
                      {PERMISSION_ACTIONS.map(a => <th key={a} className="p-2 text-center">{ACTION_LABELS[a]}</th>)}
                    </tr></thead>
                    <tbody>
                      {PERMISSION_MODULES.map(mod => {
                        const isFounderRole = selRole.id === 'founder';
                        return (
                          <tr key={mod} className="border-t border-white/5">
                            <td className="p-2 text-white/80">{MODULE_LABELS[mod]}</td>
                            {PERMISSION_ACTIONS.map(act => {
                              const perm = permissions.find(p => p.module === mod && p.action === act);
                              const checked = isFounderRole ? true : !!perm?.allowed;
                              return (
                                <td key={act} className="p-2 text-center">
                                  <input type="checkbox" className="accent-synf-500" checked={checked} disabled={isFounderRole} onChange={e => togglePerm(mod, act, e.target.checked)} />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {selRole.id === 'founder' && <p className="text-xs text-gold-400">The Founder role always has all permissions. These cannot be modified.</p>}
              </div>
            </>
          ) : (
            <div className="card p-10 text-center"><Shield className="mx-auto h-10 w-10 text-ink-500" /><p className="mt-3 text-white/50">Select a role to view and edit its permissions.</p></div>
          )}
        </div>
      </div>

      {/* Create role modal */}
      {showCreate && (
        <CreateRoleModal roles={roles} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadRoles(); showToast('ok', 'Role created'); }} onError={(msg) => showToast('err', msg)} />
      )}
    </div>
  );
}

function CreateRoleModal({ roles, onClose, onCreated, onError }: { roles: RoleDefinitionRow[]; onClose: () => void; onCreated: () => void; onError: (msg: string) => void }) {
  const [form, setForm] = useState({ id: '', display_name: '', description: '', hierarchy_level: '50', can_assign_roles: [] as string[], can_manage_roles: [] as string[] });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id || !form.display_name) { onError('Role ID and display name are required'); return; }
    setLoading(true);
    const r = await rolesPermissionsAction({ action: 'create_role', ...form, hierarchy_level: parseInt(form.hierarchy_level) });
    setLoading(false);
    if (r.error) { onError(r.error); return; }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md space-y-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-display text-xl font-extrabold">Create New Role</h2><button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button></div>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Role ID (internal, cannot change) *</label><input className="input font-mono" required placeholder="e.g. creative_director" value={form.id} onChange={e => set('id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} /></div>
          <div><label className="label">Display Name *</label><input className="input" required placeholder="e.g. Creative Director" value={form.display_name} onChange={e => set('display_name', e.target.value)} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[60px]" value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div><label className="label">Hierarchy Level (0 = highest)</label><input className="input" type="number" value={form.hierarchy_level} onChange={e => set('hierarchy_level', e.target.value)} /></div>
          <div>
            <label className="label">Can Assign These Roles</label>
            <div className="flex flex-wrap gap-2">
              {roles.filter(r => r.id !== 'founder').map(r => {
                const on = form.can_assign_roles.includes(r.id);
                return <button key={r.id} type="button" onClick={() => set('can_assign_roles', on ? form.can_assign_roles.filter(x => x !== r.id) : [...form.can_assign_roles, r.id])} className={`chip border ${on ? 'border-synf-500 bg-synf-500/20 text-synf-300' : 'border-white/10 text-white/60'}`}>{r.display_name}</button>;
              })}
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating…' : 'Create Role'}</button>
        </form>
      </div>
    </div>
  );
}
