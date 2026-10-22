import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowUpRight } from 'lucide-react';
import type { EventRow } from '@/lib/types';
import { formatDate } from '@/lib/format';

const STATUS_STYLES: Record<string, string> = {
  announced: 'bg-synf-500/20 text-synf-300 border-synf-500/40',
  upcoming: 'bg-acid-400/20 text-acid-400 border-acid-400/40',
  completed: 'bg-white/5 text-white/50 border-white/10',
  postponed: 'bg-gold-400/20 text-gold-400 border-gold-400/40',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/40',
  sold_out: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  draft: 'bg-white/5 text-white/40 border-white/10',
};

export function EventCard({ event }: { event: EventRow }) {
  const past = event.status === 'completed';
  return (
    <Link
      to={`/events/${event.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-ink-900 transition-all duration-500 hover:border-synf-500/50 hover:shadow-[0_20px_80px_-20px] hover:shadow-synf-500/50"
      data-cursor="hover"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.cover_image_alt || event.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110 group-hover:rotate-1"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 via-synf-600 to-ink-950">
            <span className="font-display text-8xl font-extrabold tracking-tightest text-white/10">{event.title.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent transition-opacity duration-500 group-hover:from-ink-950" />
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: 'linear-gradient(120deg, transparent 30%, rgba(255,45,111,0.25) 50%, transparent 70%)', mixBlendMode: 'overlay' }} />

        {/* Oversized date stamp */}
        {event.start_at && (
          <div className="absolute right-3 top-3 flex flex-col items-center rounded-xl border-2 border-white/20 bg-ink-950/80 px-2.5 py-1.5 text-center backdrop-blur-sm">
            <span className="font-mono text-[9px] uppercase tracking-widest text-synf-400">{new Date(event.start_at).toLocaleDateString('en-GB', { month: 'short' })}</span>
            <span className="font-display text-xl font-extrabold leading-none text-white">{new Date(event.start_at).getDate()}</span>
          </div>
        )}

        <div className="absolute left-4 top-4 flex gap-2">
          <span className={`chip border backdrop-blur-sm ${STATUS_STYLES[event.status] || STATUS_STYLES.draft}`}>
            {event.status.replace('_', ' ')}
          </span>
          {event.featured && <span className="chip border border-acid-400/40 bg-acid-400/20 text-acid-400 backdrop-blur-sm">Featured</span>}
        </div>

        <div className="absolute right-4 bottom-4 grid h-10 w-10 place-items-center rounded-full bg-synf-500 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
          <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="font-display text-xl font-extrabold leading-tight tracking-tight text-white transition-transform duration-300 group-hover:translate-x-1">{event.title}</h3>
        {event.subtitle && <p className="mt-1 text-sm text-white/55">{event.subtitle}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
          {event.start_at && (
            <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(event.start_at)}</span>
          )}
          {event.venue_city && (
            <span className="flex items-center gap-1"><MapPin size={12} /> {event.venue_city}</span>
          )}
          {past && <span className="text-ink-500">Past event</span>}
        </div>
      </div>
    </Link>
  );
}
