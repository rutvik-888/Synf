import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, CheckSquare, Megaphone, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { CrewAssignmentRow, EventRow, AnnouncementRow, TaskRow } from '@/lib/types';
import { formatDateTime, relativeTime } from '@/lib/format';

export function CrewPortal() {
  const { user, loading } = useAuth();
  const [assignments, setAssignments] = useState<(CrewAssignmentRow & { events?: EventRow })[]>([]);
  const [announcements, setAnnouncements] = useState<(AnnouncementRow & { events?: EventRow })[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [load, setLoad] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [a, t] = await Promise.all([
        supabase.from('crew_assignments').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('assignee_id', user.id).order('due_at'),
      ]);
      const assigns = (a.data as CrewAssignmentRow[]) || [];
      setTasks((t.data as TaskRow[]) || []);
      if (assigns.length > 0) {
        const evIds = assigns.map(x => x.event_id);
        const { data: evs } = await supabase.from('events').select('*').in('id', evIds);
        const evMap = new Map(((evs as EventRow[]) || []).map(e => [e.id, e]));
        setAssignments(assigns.map(x => ({ ...x, events: evMap.get(x.event_id) })));

        const { data: anns } = await supabase.from('announcements').select('*').in('event_id', evIds).order('published_at', { ascending: false }).limit(10);
        setAnnouncements(((anns as AnnouncementRow[]) || []).map(an => ({ ...an, events: evMap.get(an.event_id) })));
      }
      setLoad(false);
    })();
  }, [user]);

  if (loading || load) return <div className="text-white/50">Loading your assignments…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  if (assignments.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-ink-500" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">No crew assignments yet</h1>
        <p className="mt-2 text-white/50">When an Event Manager assigns you to an event, it'll appear here. You'll only see events you're assigned to — nothing else.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div><h1 className="font-display text-3xl font-extrabold tracking-tight">Your crew shifts</h1><p className="text-white/50">Events you're assigned to. Acknowledge your shifts and track your tasks.</p></div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="font-display text-lg font-extrabold flex items-center gap-2"><Calendar size={16} className="text-synf-400" /> Assignments</h2>
          {assignments.map(a => (
            <div key={a.id} className="card p-5">
              <h3 className="font-display text-xl font-extrabold">{a.events?.title || 'Event'}</h3>
              <span className="chip mt-1 border border-synf-500/30 bg-synf-500/15 text-synf-300">{a.crew_role}</span>
              <div className="mt-3 space-y-1.5 text-sm text-white/70">
                {a.events?.start_at && <div className="flex items-center gap-2"><Calendar size={14} className="text-synf-400" /> {formatDateTime(a.events.start_at)}</div>}
                {a.events?.venue_name && <div className="flex items-center gap-2"><MapPin size={14} className="text-synf-400" /> {a.events.venue_name}{a.events.venue_city ? `, ${a.events.venue_city}` : ''}</div>}
                {a.call_time && <div className="flex items-center gap-2"><Clock size={14} className="text-synf-400" /> Call time: {formatDateTime(a.call_time)}</div>}
                {a.responsibilities && <p className="mt-2 rounded-lg border border-white/5 bg-ink-900/50 p-3 text-sm text-white/70">{a.responsibilities}</p>}
                {a.events?.map_url && <a href={a.events.map_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-synf-400 hover:underline">Directions ↗</a>}
              </div>
              <button onClick={async () => { await supabase.from('crew_assignments').update({ acknowledged: true }).eq('id', a.id); setAssignments(arr => arr.map(x => x.id === a.id ? { ...x, acknowledged: true } : x)); }} disabled={a.acknowledged} className={`mt-4 w-full ${a.acknowledged ? 'btn-ghost text-acid-400' : 'btn-primary'}`}>
                {a.acknowledged ? <><CheckSquare size={16} /> Acknowledged</> : 'Acknowledge shift'}
              </button>
            </div>
          ))}
        </section>

        <div className="space-y-6">
          {tasks.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-display text-lg font-extrabold flex items-center gap-2"><CheckSquare size={16} className="text-synf-400" /> Your tasks</h2>
              <ul className="space-y-2">
                {tasks.map(t => (
                  <li key={t.id} className="rounded-lg border border-white/5 p-3 text-sm">
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-xs text-ink-500">{t.status} · {t.due_at ? relativeTime(t.due_at) : 'no due date'}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {announcements.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-display text-lg font-extrabold flex items-center gap-2"><Megaphone size={16} className="text-synf-400" /> Announcements</h2>
              <ul className="space-y-3">
                {announcements.map(an => (
                  <li key={an.id} className="rounded-lg border border-white/5 p-3">
                    <div className="text-xs text-synf-400">{an.events?.title}</div>
                    <div className="font-semibold">{an.title}</div>
                    <p className="mt-1 text-sm text-white/70 whitespace-pre-wrap">{an.body}</p>
                    <div className="mt-1 text-xs text-ink-500">{relativeTime(an.published_at)}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
