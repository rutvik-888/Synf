import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, MapPin, Music2, Ticket, ExternalLink, ArrowLeft, Share2, Instagram, Users, Film, Sparkles, Play, X, ChevronLeft, ChevronRight, HelpCircle, ChevronDown, Heart, CalendarPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { EventRow, EventMediaRow, EventCreditRow, EventRow as Ev } from '@/lib/types';
import type { EventFaqRow } from '@/lib/platform-types';
import { formatDate, formatTime, countdown } from '@/lib/format';
import { resolveTicketing } from '@/lib/ticketing';
import { Reveal } from '@/components/Reveal';
import { EventCard } from '@/components/EventCard';
import { useSeo, eventJsonLd, breadcrumbJsonLd } from '@/lib/seo';

export function EventDetail() {
  const { slug } = useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [media, setMedia] = useState<EventMediaRow[]>([]);
  const [credits, setCredits] = useState<EventCreditRow[]>([]);
  const [related, setRelated] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [faqs, setFaqs] = useState<EventFaqRow[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('events').select('*').eq('slug', slug).eq('is_published', true).maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      const ev = data as EventRow;
      setEvent(ev);
      const [m, c, r] = await Promise.all([
        supabase.from('event_media').select('*').eq('event_id', ev.id).order('sort_order'),
        supabase.from('event_credits').select('*').eq('event_id', ev.id).order('sort_order'),
        supabase.from('events').select('*').eq('is_published', true).neq('id', ev.id).order('start_at', { ascending: false }).limit(3),
      ]);
      setMedia((m.data as EventMediaRow[]) || []);
      setCredits((c.data as EventCreditRow[]) || []);
      setRelated((r.data as Ev[]) || []);
      const { data: faqData } = await supabase.from('event_faqs').select('*, category:event_faq_categories(*)').eq('event_id', ev.id).eq('is_published', true).order('sort_order');
      setFaqs((faqData as EventFaqRow[]) || []);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) return <div className="container-synf py-32"><div className="h-96 animate-pulse rounded-3xl bg-ink-900" /></div>;
  if (notFound || !event) return (
    <div className="container-synf py-32 text-center">
      <h1 className="font-display text-4xl font-extrabold">Event not found</h1>
      <p className="mt-3 text-white/60">This event may have been removed or isn't published yet.</p>
      <Link to="/events" className="btn-primary mt-6"><ArrowLeft size={16} /> Back to events</Link>
    </div>
  );

  const cd = countdown(event.start_at);
  const gallery = media; // mixed image + video gallery
  const isEmbed = (url: string) => url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  const isVimeo = (url: string) => url.includes('vimeo.com');

  function openLightbox(idx: number) { setLightboxIdx(idx); }
  function closeLightbox() { setLightboxIdx(null); }
  function navLightbox(dir: 1 | -1) {
    setLightboxIdx(prev => {
      if (prev === null) return prev;
      const next = prev + dir;
      if (next < 0) return gallery.length - 1;
      if (next >= gallery.length) return 0;
      return next;
    });
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: event!.title, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  }

  function getCalendarUrl(ev: EventRow): string {
    const start = ev.start_at ? new Date(ev.start_at) : null;
    const end = ev.end_at ? new Date(ev.end_at) : (start ? new Date(start.getTime() + 3 * 3600000) : null);
    if (!start || !end) return '';
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = encodeURIComponent(ev.title);
    const desc = encodeURIComponent(ev.subtitle || ev.description || 'Join us for an unforgettable night with Team Synf.');
    const loc = encodeURIComponent([ev.venue_name, ev.venue_city].filter(Boolean).join(', '));
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${desc}&location=${loc}`;
  }

  useSeo({
    title: event.title,
    description: event.subtitle || event.description || `Team Synf presents ${event.title}${event.venue_city ? ` in ${event.venue_city}` : ''}${event.start_at ? ` on ${formatDate(event.start_at, { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.`,
    path: `/events/${event.slug}`,
    image: event.cover_image_url || undefined,
    type: 'music.event',
    publishedTime: event.published_at || undefined,
    modifiedTime: event.updated_at || undefined,
    keywords: [event.title, 'Team Synf', 'Hyderabad events', event.venue_city || 'Hyderabad', ...(event.music_genres || []), 'DJ night', 'party', 'nightlife'].filter(Boolean),
    jsonLd: [
      eventJsonLd({ ...event, credits: credits.map(c => ({ name: c.name, role: c.role })) }),
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Events', path: '/events' },
        { name: event.title, path: `/events/${event.slug}` },
      ]),
    ],
  });

  return (
    <article className="bg-ink-950">
      {/* Immersive Hero with parallax */}
      <header className="relative h-[75vh] min-h-[34rem] overflow-hidden">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.cover_image_alt || event.title}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transform: `translateY(${scrollY * 0.3}px) scale(1.1)` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-800 to-ink-950">
            <span className="font-display text-[12rem] font-extrabold text-white/5">{event.title.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-ink-950/20" />
        <div className="grain pointer-events-none absolute inset-0 opacity-10" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="container-synf pb-10">
            <Link to="/events" className="mb-5 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-synf-400"><ArrowLeft size={14} /> All events</Link>
            <div className="flex flex-wrap gap-2">
              <span className="chip border border-synf-500/30 bg-synf-500/15 text-synf-300 backdrop-blur-sm">{event.status.replace('_', ' ')}</span>
              {event.featured && <span className="chip border border-acid-400/30 bg-acid-400/15 text-acid-400 backdrop-blur-sm">Featured</span>}
              {event.music_genres && event.music_genres.slice(0, 2).map(g => (
                <span key={g} className="chip border border-white/15 bg-ink-950/60 text-white/70 backdrop-blur-sm">{g}</span>
              ))}
            </div>
            <h1 className="mt-5 display-xl text-balance text-[clamp(2.5rem,8vw,6.5rem)]">{event.title}</h1>
            {event.subtitle && <p className="mt-3 max-w-2xl text-xl text-white/70">{event.subtitle}</p>}

            {/* Meta strip */}
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-sm">
              {event.start_at && (
                <div className="flex items-center gap-2 text-white/80"><Calendar size={15} className="text-synf-400" /> {formatDate(event.start_at, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}{event.start_at && <span className="text-white/40">· {formatTime(event.start_at)}</span>}</div>
              )}
              {(event.venue_name || event.venue_city) && (
                <div className="flex items-center gap-2 text-white/80"><MapPin size={15} className="text-synf-400" /> {event.venue_name || 'Venue TBC'}{event.venue_city ? `, ${event.venue_city}` : ''}</div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container-synf grid gap-12 py-16 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-12">
          {/* Countdown */}
          {cd && !cd.past && ['announced', 'upcoming'].includes(event.status) && (
            <Reveal>
              <div className="grid grid-cols-4 gap-3 rounded-2xl border border-synf-500/20 bg-synf-500/5 p-6 text-center backdrop-blur-sm">
                {[['Days', cd.days], ['Hours', cd.hours], ['Mins', cd.mins], ['Secs', cd.secs]].map(([l, v]) => (
                  <div key={l as string}>
                    <div className="font-display text-3xl font-extrabold text-synf-400 sm:text-5xl">{String(v).padStart(2, '0')}</div>
                    <div className="mt-1 text-xs uppercase tracking-widest text-ink-500">{l}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* Story */}
          {event.story && (
            <Reveal>
              <div className="section-eyebrow"><Film size={14} /> The story</div>
              <div className="prose prose-invert max-w-none text-lg leading-relaxed text-white/80 whitespace-pre-wrap">{event.story}</div>
            </Reveal>
          )}
          {event.description && (
            <Reveal>
              <div className="text-lg leading-relaxed text-white/70 whitespace-pre-wrap">{event.description}</div>
            </Reveal>
          )}

          {/* Gallery — mixed image + video with lightbox */}
          {gallery.length > 0 && (
            <Reveal>
              <div className="section-eyebrow"><Film size={14} /> Gallery</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((m, i) => {
                  const embed = m.type === 'video' && isEmbed(m.url);
                  return (
                    <figure
                      key={m.id}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 transition-all duration-300 hover:border-synf-500/40"
                      onClick={() => openLightbox(i)}
                    >
                      <div className="relative aspect-video w-full overflow-hidden">
                        {m.type === 'image' ? (
                          <img
                            src={m.url}
                            alt={m.alt || m.caption || ''}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : m.type === 'video' && !embed ? (
                          <video
                            src={m.url}
                            poster={m.poster_url || undefined}
                            muted
                            preload="metadata"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-ink-800">
                            <img
                              src={`https://img.youtube.com/vi/${m.url.split('/embed/')[1]?.split(/[?&]/)[0]}/hqdefault.jpg`}
                              alt={m.alt || m.caption || ''}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                            />
                          </div>
                        )}
                        {/* Play icon overlay for videos */}
                        {m.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/30 transition-opacity group-hover:bg-ink-950/50">
                            <div className="grid h-12 w-12 place-items-center rounded-full bg-synf-500/80 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                              <Play size={20} className="ml-0.5 text-white" fill="white" />
                            </div>
                          </div>
                        )}
                        {/* Type badge */}
                        <span className="absolute left-2 top-2 rounded-full bg-ink-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
                          {m.type === 'video' ? (embed ? 'Embed' : 'Video') : 'Image'}
                        </span>
                      </div>
                      {(m.caption || m.credit) && (
                        <figcaption className="p-3 text-xs text-white/50">
                          {m.caption && <span>{m.caption}</span>}
                          {m.credit && <span className="block text-ink-500">Photo: {m.credit}</span>}
                        </figcaption>
                      )}
                    </figure>
                  );
                })}
              </div>
            </Reveal>
          )}

          {/* Aftermovie — standalone video if set on the event */}
          {event.aftermovie_url && gallery.length === 0 && (
            <Reveal>
              <div className="section-eyebrow"><Film size={14} /> Aftermovie</div>
              <div className="aspect-video overflow-hidden rounded-xl border border-white/10">
                {isEmbed(event.aftermovie_url) ? (
                  <iframe
                    src={isVimeo(event.aftermovie_url)
                      ? event.aftermovie_url.replace('vimeo.com/', 'player.vimeo.com/video/')
                      : event.aftermovie_url.replace('watch?v=', 'embed/')}
                    className="h-full w-full"
                    title={event.title}
                    allowFullScreen
                  />
                ) : (
                  <video src={event.aftermovie_url} controls className="h-full w-full" />
                )}
              </div>
            </Reveal>
          )}

          {/* Credits */}
          {credits.length > 0 && (
            <Reveal>
              <div className="section-eyebrow"><Users size={14} /> Credits</div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {credits.map(c => (
                  <li key={c.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-900/60 px-4 py-3 text-sm transition-colors hover:border-synf-500/30">
                    <span className="text-ink-500">{c.role}</span>
                    {c.link_url ? <a href={c.link_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-white transition-colors hover:text-synf-400">{c.name} ↗</a> : <span className="font-semibold text-white">{c.name}</span>}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="card sticky top-24 space-y-4 p-6">
            <h2 className="font-display text-lg font-extrabold">Details</h2>
            {event.start_at && (
              <div className="flex items-start gap-3 text-sm"><Calendar size={16} className="mt-0.5 text-synf-400" /><div><div className="text-white">{formatDate(event.start_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>{event.end_at && <div className="text-white/50">{formatTime(event.start_at)} – {formatTime(event.end_at)}</div>}{event.timezone && <div className="text-ink-500">{event.timezone}</div>}</div></div>
            )}
            {(event.venue_name || event.venue_city) && (
              <div className="flex items-start gap-3 text-sm"><MapPin size={16} className="mt-0.5 text-synf-400" /><div><div className="text-white">{event.venue_name || 'Venue TBC'}</div>{event.venue_city && <div className="text-white/50">{event.venue_city}</div>}{event.venue_address && <div className="text-ink-500">{event.venue_address}</div>}{event.map_url && <a href={event.map_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-synf-400 transition-colors hover:text-synf-300">Directions ↗</a>}</div></div>
            )}
            {event.music_genres && event.music_genres.length > 0 && (
              <div className="flex items-start gap-3 text-sm"><Music2 size={16} className="mt-0.5 text-synf-400" /><div className="flex flex-wrap gap-1.5">{event.music_genres.map(g => <span key={g} className="chip border border-white/10 bg-ink-800 text-white/70">{g}</span>)}</div></div>
            )}
            {event.dress_code && (
              <div className="flex items-start gap-3 text-sm"><Users size={16} className="mt-0.5 text-synf-400" /><div><div className="text-ink-500">Dress code</div><div className="text-white">{event.dress_code}</div></div></div>
            )}

            <div className="border-t border-white/10 pt-4">
              <TicketingPanel event={event} />
            </div>

            <button onClick={share} className="btn-ghost w-full group"><Share2 size={16} /> Share event</button>
            {event.start_at && <a href={getCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full group"><CalendarPlus size={16} /> Add to calendar</a>}
            <a href="https://www.instagram.com/team.synf/" target="_blank" rel="noopener noreferrer" className="btn-ghost w-full group"><Instagram size={16} /> @team.synf</a>
          </div>
        </aside>
      </div>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="container-synf pb-12">
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-synf-400" />
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">FAQ</h2>
          </div>
          <div className="mx-auto mt-6 max-w-3xl space-y-3">
            {faqs.map((f, i) => <FaqItem key={f.id} faq={f} defaultOpen={i === 0} />)}
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="container-synf pb-24">
          <div className="flex items-center gap-3">
            <Sparkles size={20} className="text-synf-400" />
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">More events</h2>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      )}

      {/* Lightbox — supports images and videos */}
      {lightboxIdx !== null && gallery[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/95 backdrop-blur-xl animate-fade-in"
          onClick={closeLightbox}
          onKeyDown={e => { if (e.key === 'Escape') closeLightbox(); if (e.key === 'ArrowLeft') navLightbox(-1); if (e.key === 'ArrowRight') navLightbox(1); }}
          tabIndex={0}
        >
          {/* Close button */}
          <button
            className="absolute right-6 top-6 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Nav buttons */}
          {gallery.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                onClick={(e) => { e.stopPropagation(); navLightbox(-1); }}
                aria-label="Previous"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                className="absolute right-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                onClick={(e) => { e.stopPropagation(); navLightbox(1); }}
                aria-label="Next"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Counter */}
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/70">
            {lightboxIdx + 1} / {gallery.length}
          </span>

          {/* Content */}
          {(() => {
            const m = gallery[lightboxIdx];
            const embed = m.type === 'video' && isEmbed(m.url);
            if (m.type === 'image') {
              return (
                <img
                  src={m.url}
                  alt={m.alt || m.caption || ''}
                  className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain animate-scale-in"
                  onClick={(e) => e.stopPropagation()}
                />
              );
            }
            if (embed) {
              return (
                <div className="aspect-video w-full max-w-[90vw] overflow-hidden rounded-xl" onClick={(e) => e.stopPropagation()}>
                  <iframe
                    src={m.url}
                    className="h-full w-full"
                    title={m.alt || m.caption || 'Video'}
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    allowFullScreen
                  />
                </div>
              );
            }
            return (
              <video
                src={m.url}
                poster={m.poster_url || undefined}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[90vw] rounded-xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              />
            );
          })()}
        </div>
      )}
    </article>
  );
}

function FaqItem({ faq, defaultOpen }: { faq: EventFaqRow; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-900/60">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-white/5">
        <span className="font-semibold text-white/90">{faq.question}</span>
        <ChevronDown size={18} className={`shrink-0 text-white/40 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 text-white/65 leading-relaxed">{faq.answer}</div>}
    </div>
  );
}

function TicketingPanel({ event }: { event: EventRow }) {
  const config = resolveTicketing(event);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-base font-extrabold">{config.heading}</h3>
        <p className="mt-1 text-sm leading-relaxed text-white/60">{config.message}</p>
      </div>
      <div className="flex flex-col gap-2">
        {config.primary && (
          <a
            href={config.primary.url}
            target={config.primary.external ? '_blank' : undefined}
            rel={config.primary.external ? 'noopener noreferrer' : undefined}
            className={`group flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-300 ${
              config.primary.variant === 'accent'
                ? 'bg-acid-400 text-ink-950 hover:bg-acid-300 hover:shadow-[0_0_20px_-5px] hover:shadow-acid-400/50'
                : config.primary.variant === 'disabled'
                ? 'cursor-not-allowed border border-synf-500/40 bg-synf-500/10 text-synf-400'
                : 'bg-synf-500 text-white hover:bg-synf-400 hover:shadow-[0_0_20px_-5px] hover:shadow-synf-500/50'
            }`}
          >
            {config.primary.variant === 'accent' ? <Ticket size={16} /> : <Instagram size={16} />}
            {config.primary.label}
            <ExternalLink size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        )}
        {config.secondary && (
          <a
            href={config.secondary.url}
            target={config.secondary.external ? '_blank' : undefined}
            rel={config.secondary.external ? 'noopener noreferrer' : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 transition-all duration-300 hover:border-synf-500/40 hover:text-white"
          >
            {config.secondary.label}
            <ExternalLink size={12} />
          </a>
        )}
        {!config.primary && !config.secondary && (
          <p className="rounded-lg border border-white/10 bg-ink-800/50 p-3 text-center text-xs text-white/50">Check back soon for ticketing information.</p>
        )}
      </div>
    </div>
  );
}
