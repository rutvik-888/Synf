import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { formatDate } from '@/lib/format';

type CalendarItem = {
  id: string;
  title: string;
  type: string;
  date: string | null;
  status: string;
  url: string;
};

export function AdminContentCalendar() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => { load(); }, []);

  async function load() {
    const [events, campaigns, goods] = await Promise.all([
      supabase.from('events').select('id,title,start_at,status').not('start_at', 'is', null),
      supabase.from('campaigns').select('id,name,start_date,end_date,status'),
      supabase.from('goods_products').select('id,name,published_at,status'),
    ]);

    const all: CalendarItem[] = [
      ...((events.data || []).map((e: Record<string, unknown>) => ({ id: e.id as string, title: e.title as string, type: 'Event', date: e.start_at as string, status: e.status as string, url: `/admin/events/${e.id}` }))),
      ...((campaigns.data || []).map((c: Record<string, unknown>) => ({ id: c.id as string, title: c.name as string, type: 'Campaign', date: (c.start_date || c.end_date) as string, status: c.status as string, url: '/admin/campaigns' }))).filter(c => c.date),
      ...((goods.data || []).map((g: Record<string, unknown>) => ({ id: g.id as string, title: g.name as string, type: 'Goods', date: g.published_at as string, status: g.status as string, url: '/admin/goods' }))).filter(g => g.date),
    ];
    setItems(all);
    setLoading(false);
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();
  const monthName = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const itemsByDay: Record<number, CalendarItem[]> = {};
  items.forEach(item => {
    if (!item.date) return;
    const d = new Date(item.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!itemsByDay[day]) itemsByDay[day] = [];
      itemsByDay[day].push(item);
    }
  });

  const typeColors: Record<string, string> = {
    Event: 'bg-synf-500/20 text-synf-300 border-synf-500/30',
    Campaign: 'bg-acid-400/20 text-acid-400 border-acid-400/30',
    Goods: 'bg-ember-500/20 text-ember-400 border-ember-500/30',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Content Calendar</h1>
        <p className="text-sm text-white/50">Unified view of all scheduled content across the platform.</p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:border-synf-500/40"><ChevronLeft size={18} /></button>
          <h2 className="font-display text-xl font-bold min-w-[12rem] text-center">{monthName}</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:border-synf-500/40"><ChevronRight size={18} /></button>
        </div>
        <button onClick={() => setCurrentDate(new Date())} className="btn-ghost px-3 py-1.5 text-xs">Today</button>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {Object.entries(typeColors).map(([type, cls]) => (
          <span key={type} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${cls}`}><span className="h-2 w-2 rounded-full bg-current" /> {type}</span>
        ))}
      </div>

      {loading ? <div className="h-96 animate-pulse rounded-xl bg-white/5" /> : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="p-2 text-center text-xs font-semibold uppercase tracking-widest text-white/40">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startWeekday }).map((_, i) => <div key={`e${i}`} className="min-h-[7rem] border-b border-r border-white/5 bg-white/[0.02]" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayItems = itemsByDay[day] || [];
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              return (
                <div key={day} className={`min-h-[7rem] border-b border-r border-white/5 p-1.5 ${isToday ? 'bg-synf-500/5' : ''}`}>
                  <div className={`mb-1 text-xs font-semibold ${isToday ? 'text-synf-400' : 'text-white/40'}`}>{day}</div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(item => (
                      <a key={item.id} href={item.url} className={`block truncate rounded border px-1.5 py-0.5 text-[10px] ${typeColors[item.type] || 'bg-white/5 text-white/50 border-white/10'}`}>
                        {item.title}
                      </a>
                    ))}
                    {dayItems.length > 3 && <div className="text-[10px] text-white/30">+{dayItems.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming list */}
      <div className="mt-6">
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Clock size={16} /> Upcoming</h3>
        <div className="space-y-2">
          {items.filter(i => i.date && new Date(i.date) > new Date()).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime()).slice(0, 10).map(item => (
            <a key={`${item.id}-${item.type}`} href={item.url} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:border-synf-500/30">
              <span className={`chip border text-[10px] ${typeColors[item.type] || ''}`}>{item.type}</span>
              <span className="flex-1 truncate text-sm">{item.title}</span>
              <span className="text-xs text-white/40">{formatDate(item.date)}</span>
            </a>
          ))}
          {items.filter(i => i.date && new Date(i.date) > new Date()).length === 0 && <p className="text-sm text-white/40">No upcoming scheduled content.</p>}
        </div>
      </div>
    </div>
  );
}
