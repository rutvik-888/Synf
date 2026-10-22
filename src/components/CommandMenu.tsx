import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CalendarDays, Inbox, UserSquare, Users, FileText, Plus, Home } from 'lucide-react';

interface Item { label: string; to: string; icon: typeof Search; }

export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);

  const items: Item[] = [
    { label: 'Dashboard', to: '/admin', icon: Home },
    { label: 'Events', to: '/admin/events', icon: CalendarDays },
    { label: 'New event', to: '/admin/events/new', icon: Plus },
    { label: 'Enquiries', to: '/admin/enquiries', icon: Inbox },
    { label: 'Applications', to: '/admin/applications', icon: UserSquare },
    { label: 'The Collective', to: '/admin/people', icon: Users },
    { label: 'Team', to: '/admin/team', icon: Users },
    { label: 'Content', to: '/admin/content', icon: FileText },
    { label: 'View public site', to: '/', icon: Home },
  ];

  const filtered = items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[idx]) { navigate(filtered[idx].to); onClose(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, idx, navigate, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); onClose(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/70 p-4 pt-[15vh] backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/5 p-4">
          <Search size={18} className="text-ink-500" />
          <input autoFocus className="flex-1 bg-transparent text-white placeholder:text-ink-500 focus:outline-none" placeholder="Search or jump to…" value={q} onChange={e => { setQ(e.target.value); setIdx(0); }} />
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-ink-500">ESC</kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto p-2">
          {filtered.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <button onMouseEnter={() => setIdx(i)} onClick={() => { navigate(it.to); onClose(); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === idx ? 'bg-synf-500/15 text-synf-300' : 'text-white/70 hover:bg-white/5'}`}>
                  <Icon size={16} /> {it.label}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="p-4 text-center text-sm text-ink-500">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
