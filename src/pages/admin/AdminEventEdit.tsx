import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Trash2, Plus, X, Eye, ArrowLeft, AlertCircle, Ticket, Instagram, ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { EventRow, EventMediaRow, EventCreditRow } from '@/lib/types';
import { slugify } from '@/lib/format';
import { MediaUploader, type MediaItem } from '@/components/MediaUploader';
import { resolveTicketing, BOOKING_METHODS } from '@/lib/ticketing';

const EMPTY: Partial<EventRow> = {
  title: '', slug: '', subtitle: '', status: 'draft', featured: false, category: '',
  start_at: '', end_at: '', timezone: '', venue_name: '', venue_city: '', venue_address: '',
  map_url: '', dress_code: '', music_genres: [], description: '', story: '', ticket_url: '',
  info_url: '', cover_image_url: '', cover_image_alt: '', aftermovie_url: '', is_published: false,
  booking_method: 'coming_soon', booking_cta_label: null, ticketing_message_mode: 'automatic',
  ticketing_custom_heading: null, ticketing_custom_message: null, ticketing_custom_cta_label: null,
  ticketing_custom_cta_url: null, ticketing_secondary_cta_label: null, ticketing_secondary_cta_url: null,
  waitlist_url: null, cancellation_info_url: null, ticketing_last_updated_at: null,
};

function eventRowToMediaItem(url: string | null | undefined, type: 'image' | 'video', alt?: string | null): MediaItem | null {
  if (!url) return null;
  return { url, type, source_type: 'url', alt: alt || null };
}

function mediaItemToEventMedia(item: MediaItem, eventId: string, sortOrder: number): Omit<EventMediaRow, 'id'> {
  return {
    event_id: eventId,
    type: item.type,
    url: item.url,
    alt: item.alt || null,
    caption: item.caption || null,
    credit: null,
    source_url: null,
    source_type: item.source_type,
    poster_url: item.poster_url || null,
    mime_type: item.mime_type || null,
    file_size: item.file_size || null,
    original_filename: item.original_filename || null,
    width: item.width || null,
    height: item.height || null,
    sort_order: sortOrder,
  };
}

export function AdminEventEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === 'new' || !id;
  const [ev, setEv] = useState<Partial<EventRow>>(EMPTY);
  const [genres, setGenres] = useState('');
  const [gallery, setGallery] = useState<MediaItem[]>([]);
  const [credits, setCredits] = useState<EventCreditRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
      if (!data) { setErr('Event not found'); setLoading(false); return; }
      const e = data as EventRow;
      setEv(e);
      setGenres((e.music_genres || []).join(', '));
      const [m, c] = await Promise.all([
        supabase.from('event_media').select('*').eq('event_id', e.id).order('sort_order'),
        supabase.from('event_credits').select('*').eq('event_id', e.id).order('sort_order'),
      ]);
      const mediaRows = (m.data as EventMediaRow[]) || [];
      setGallery(mediaRows.map(r => ({
        url: r.url,
        type: r.type,
        source_type: (r.source_type as MediaItem['source_type']) || 'url',
        alt: r.alt,
        caption: r.caption,
        poster_url: r.poster_url,
        mime_type: r.mime_type,
        file_size: r.file_size,
        original_filename: r.original_filename,
        width: r.width,
        height: r.height,
      })));
      setCredits((c.data as EventCreditRow[]) || []);
      setLoading(false);
    })();
  }, [id, isNew]);

  const set = (k: keyof EventRow, v: unknown) => setEv(prev => ({ ...prev, [k]: v }));

  const coverItem: MediaItem | null = eventRowToMediaItem(ev.cover_image_url, 'image', ev.cover_image_alt);
  const aftermovieItem: MediaItem | null = eventRowToMediaItem(ev.aftermovie_url, 'video');

  const onCoverChange = useCallback((val: MediaItem | MediaItem[] | null) => {
    const item = Array.isArray(val) ? val[0] : val;
    setEv(prev => ({ ...prev, cover_image_url: item?.url || '', cover_image_alt: item?.alt || '' }));
  }, []);

  const onAftermovieChange = useCallback((val: MediaItem | MediaItem[] | null) => {
    const item = Array.isArray(val) ? val[0] : val;
    setEv(prev => ({ ...prev, aftermovie_url: item?.url || '' }));
  }, []);

  const onGalleryChange = useCallback((val: MediaItem | MediaItem[] | null) => {
    setGallery(Array.isArray(val) ? val : val ? [val] : []);
  }, []);

  async function save(publish = false) {
    setErr(''); setSaving(true);
    const payload = {
      ...ev,
      slug: ev.slug || slugify(ev.title || ''),
      music_genres: genres.split(',').map(g => g.trim()).filter(Boolean),
      is_published: publish ? true : ev.is_published,
      published_at: publish && !ev.published_at ? new Date().toISOString() : ev.published_at,
      updated_at: new Date().toISOString(),
    } as EventRow;

    if (!payload.title) { setErr('Title is required'); setSaving(false); return; }
    if (!payload.slug) { setErr('Slug is required'); setSaving(false); return; }

    let recordId = id;
    if (isNew) {
      payload.created_by = user?.id ?? null;
      const { data, error } = await supabase.from('events').insert(payload).select('id').single();
      if (error) { setErr(error.message); setSaving(false); return; }
      recordId = (data as { id: string }).id;
      navigate(`/admin/events/${recordId}`, { replace: true });
    } else {
      const { error } = await supabase.from('events').update(payload).eq('id', id!);
      if (error) { setErr(error.message); setSaving(false); return; }
    }

    await logActivity(recordId!, `Event ${publish ? 'published' : 'saved'}`, ev.title || '');

    // Sync gallery: replace all media rows
    await supabase.from('event_media').delete().eq('event_id', recordId);
    for (let i = 0; i < gallery.length; i++) {
      await supabase.from('event_media').insert(mediaItemToEventMedia(gallery[i], recordId!, i));
    }

    // Sync credits: delete and re-insert
    await supabase.from('event_credits').delete().eq('event_id', recordId);
    for (let i = 0; i < credits.length; i++) {
      const c = credits[i];
      await supabase.from('event_credits').insert({ event_id: recordId, role: c.role, name: c.name, link_url: c.link_url, sort_order: i });
    }

    setSaving(false);
    if (publish) navigate('/admin/events');
  }

  async function del() {
    if (!id || isNew) return;
    if (!confirm('Delete this event? This cannot be undone.')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { setErr(error.message); return; }
    navigate('/admin/events');
  }

  async function logActivity(targetId: string, action: string, summary: string) {
    await supabase.from('activity_log').insert({ actor_id: user?.id, action, target_type: 'events', target_id: targetId, summary });
  }

  function addCredit() { setCredits(c => [...c, { id: 'new_' + Date.now(), event_id: id || '', role: '', name: '', link_url: '', sort_order: c.length } as EventCreditRow]); }

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-ink-900" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/events" className="mb-2 inline-flex items-center gap-1 text-sm text-white/50 hover:text-synf-400"><ArrowLeft size={14} /> Events</Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{isNew ? 'New event' : ev.title || 'Event'}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew && ev.slug && <a href={`/events/${ev.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost"><Eye size={16} /> Preview</a>}
          {!isNew && <button onClick={del} className="btn-ghost text-synf-400 hover:bg-synf-500/10"><Trash2 size={16} /></button>}
        </div>
      </div>

      {err && <div className="rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300">{err}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-extrabold">Basics</h2>
            <div><label className="label">Title *</label><input className="input" value={ev.title || ''} onChange={e => { set('title', e.target.value); if (isNew) set('slug', slugify(e.target.value)); }} /></div>
            <div><label className="label">Slug</label><input className="input" value={ev.slug || ''} onChange={e => set('slug', e.target.value)} placeholder="url-friendly-id" /></div>
            <div><label className="label">Subtitle</label><input className="input" value={ev.subtitle || ''} onChange={e => set('subtitle', e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Status</label><select className="input" value={ev.status} onChange={e => set('status', e.target.value)}>{['draft','announced','upcoming','completed','postponed','cancelled','sold_out'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
              <div><label className="label">Category</label><input className="input" value={ev.category || ''} onChange={e => set('category', e.target.value)} placeholder="e.g. Party, DJ Night" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-synf-500" checked={!!ev.featured} onChange={e => set('featured', e.target.checked)} /> Featured on homepage</label>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-extrabold">Date & venue</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="label">Start</label><input className="input" type="datetime-local" value={ev.start_at ? new Date(ev.start_at).toISOString().slice(0,16) : ''} onChange={e => set('start_at', e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
              <div><label className="label">End</label><input className="input" type="datetime-local" value={ev.end_at ? new Date(ev.end_at).toISOString().slice(0,16) : ''} onChange={e => set('end_at', e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>
              <div><label className="label">Timezone</label><input className="input" value={ev.timezone || ''} onChange={e => set('timezone', e.target.value)} placeholder="e.g. GMT" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Venue name</label><input className="input" value={ev.venue_name || ''} onChange={e => set('venue_name', e.target.value)} /></div>
              <div><label className="label">City</label><input className="input" value={ev.venue_city || ''} onChange={e => set('venue_city', e.target.value)} /></div>
            </div>
            <div><label className="label">Address</label><input className="input" value={ev.venue_address || ''} onChange={e => set('venue_address', e.target.value)} /></div>
            <div><label className="label">Map link</label><input className="input" value={ev.map_url || ''} onChange={e => set('map_url', e.target.value)} placeholder="https://maps…" /></div>
            <div><label className="label">Dress code</label><input className="input" value={ev.dress_code || ''} onChange={e => set('dress_code', e.target.value)} /></div>
            <div><label className="label">Music genres (comma separated)</label><input className="input" value={genres} onChange={e => setGenres(e.target.value)} placeholder="Afrobeats, Amapiano, House" /></div>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-extrabold">Content</h2>
            <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={ev.description || ''} onChange={e => set('description', e.target.value)} /></div>
            <div><label className="label">Story (longer editorial)</label><textarea className="input min-h-[140px]" value={ev.story || ''} onChange={e => set('story', e.target.value)} /></div>

            <div>
              <label className="label mb-2 block">Cover image</label>
              <MediaUploader
                value={coverItem}
                onChange={onCoverChange}
                multiple={false}
                accept={['image']}
                bucket="event-media"
                pathPrefix={`events/${ev.slug || id || 'new'}/cover`}
                maxFileSizeMB={10}
                label="Drag a cover image here or click to browse"
                aspectRatio="16/9"
                allowUrl
                showMetadata
              />
            </div>

            <div>
              <label className="label mb-2 block">Aftermovie / video</label>
              <MediaUploader
                value={aftermovieItem}
                onChange={onAftermovieChange}
                multiple={false}
                accept={['video']}
                bucket="event-media"
                pathPrefix={`events/${ev.slug || id || 'new'}/aftermovie`}
                maxFileSizeMB={100}
                label="Drag a video here or click to browse"
                aspectRatio="16/9"
                allowUrl
              />
            </div>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-extrabold">Gallery & media</h2>
            <p className="text-sm text-ink-500">Upload photos and videos from the event. Mix uploads, URLs, and YouTube/Vimeo embeds. Drag to reorder.</p>
            <MediaUploader
              value={gallery}
              onChange={onGalleryChange}
              multiple
              accept={['image', 'video']}
              bucket="event-media"
              pathPrefix={`events/${ev.slug || id || 'new'}/gallery`}
              maxFileSizeMB={50}
              label="Drag photos or videos here, or click to browse"
              aspectRatio="3/2"
              allowUrl
              showMetadata
            />
          </section>

          <section className="card space-y-4 p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-extrabold">Credits</h2><button onClick={addCredit} className="btn-outline py-1.5"><Plus size={14} /> Add</button></div>
            {credits.length === 0 && <p className="text-sm text-ink-500">No credits yet. Add DJs, artists, photographers, venues, partners.</p>}
            {credits.map(c => (
              <div key={c.id} className="grid gap-2 rounded-lg border border-white/5 p-3 sm:grid-cols-3">
                <input className="input" placeholder="Role (e.g. DJ)" value={c.role} onChange={e => setCredits(arr => arr.map(x => x.id === c.id ? { ...x, role: e.target.value } : x))} />
                <input className="input" placeholder="Name" value={c.name} onChange={e => setCredits(arr => arr.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} />
                <div className="flex gap-2"><input className="input" placeholder="Link (optional)" value={c.link_url || ''} onChange={e => setCredits(arr => arr.map(x => x.id === c.id ? { ...x, link_url: e.target.value } : x))} /><button onClick={() => setCredits(arr => arr.filter(x => x.id !== c.id))} className="btn-ghost text-synf-400"><X size={14} /></button></div>
              </div>
            ))}
          </section>
        </div>

        <aside className="space-y-4">
          {/* Tickets & Booking — full configuration */}
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-extrabold">Tickets & Booking</h2>

            {/* Ticketing message mode */}
            <div>
              <label className="label">Ticketing Message Mode</label>
              <div className="mt-1 flex gap-2">
                <button type="button" onClick={() => set('ticketing_message_mode', 'automatic')} className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${ev.ticketing_message_mode === 'automatic' ? 'bg-synf-500/20 text-synf-300' : 'bg-ink-900 text-white/60'}`}>Automatic</button>
                <button type="button" onClick={() => set('ticketing_message_mode', 'custom')} className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${ev.ticketing_message_mode === 'custom' ? 'bg-synf-500/20 text-synf-300' : 'bg-ink-900 text-white/60'}`}>Custom</button>
              </div>
              <p className="mt-1 text-xs text-ink-500">{ev.ticketing_message_mode === 'automatic' ? 'Derives message and CTA from event status and booking details.' : 'Use your custom heading, message, and CTA configuration.'}</p>
            </div>

            {/* Booking method */}
            <div>
              <label className="label">Booking Method</label>
              <select className="input" value={ev.booking_method || 'coming_soon'} onChange={e => set('booking_method', e.target.value)}>
                {BOOKING_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            {/* Booking URL (for external_link method) */}
            {(ev.booking_method === 'external_link' || ev.booking_method === 'manual') && (
              <div>
                <label className="label">Ticket / Booking URL</label>
                <input className="input" value={ev.ticket_url || ''} onChange={e => set('ticket_url', e.target.value)} placeholder="https://tickets.example.com/…" />
                {ev.ticket_url && !ev.ticket_url.startsWith('https://') && ev.ticket_url !== '' && (
                  <p className="mt-1 text-xs text-gold-400">URL should use HTTPS for security.</p>
                )}
              </div>
            )}

            {/* Custom CTA label */}
            {ev.booking_method === 'external_link' && (
              <div>
                <label className="label">Custom CTA Label <span className="text-ink-500">(optional)</span></label>
                <input className="input" value={ev.booking_cta_label || ''} onChange={e => set('booking_cta_label', e.target.value)} placeholder="e.g. Book Tickets, Register Now, Get Passes" />
              </div>
            )}

            {/* Instagram booking info */}
            {(ev.booking_method === 'instagram_dm' || ev.booking_method === 'instagram_profile') && (
              <div className="rounded-lg border border-white/5 bg-ink-900/50 p-3 text-sm">
                <div className="flex items-center gap-2 text-synf-400"><Instagram size={14} /> Instagram Booking</div>
                <p className="mt-1 text-xs text-white/60">
                  {ev.booking_method === 'instagram_dm'
                    ? 'Visitors will be directed to @team.synf on Instagram to send a DM for booking details.'
                    : 'Visitors will be directed to the @team.synf Instagram profile.'}
                </p>
                <a href="https://www.instagram.com/team.synf/" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-synf-400 hover:underline">https://www.instagram.com/team.synf/</a>
              </div>
            )}

            {/* Custom mode fields */}
            {ev.ticketing_message_mode === 'custom' && (
              <div className="space-y-3 rounded-lg border border-synf-500/20 bg-synf-500/5 p-3">
                <div className="text-xs font-bold uppercase tracking-widest text-synf-400">Custom Ticketing Content</div>
                <div><label className="label">Custom heading</label><input className="input" value={ev.ticketing_custom_heading || ''} onChange={e => set('ticketing_custom_heading', e.target.value)} placeholder="e.g. Tickets & Registration" /></div>
                <div><label className="label">Custom message</label><textarea className="input min-h-[60px]" value={ev.ticketing_custom_message || ''} onChange={e => set('ticketing_custom_message', e.target.value)} placeholder="Your custom booking instructions…" /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label">Custom CTA label</label><input className="input" value={ev.ticketing_custom_cta_label || ''} onChange={e => set('ticketing_custom_cta_label', e.target.value)} placeholder="e.g. Register Now" /></div>
                  <div><label className="label">Custom CTA URL</label><input className="input" value={ev.ticketing_custom_cta_url || ''} onChange={e => set('ticketing_custom_cta_url', e.target.value)} placeholder="https://…" /></div>
                </div>
              </div>
            )}

            {/* Secondary CTA (waitlist / cancellation info / aftermovie) */}
            <div className="space-y-3 border-t border-white/5 pt-3">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-500">Optional Secondary CTA</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Secondary CTA label</label><input className="input" value={ev.ticketing_secondary_cta_label || ''} onChange={e => set('ticketing_secondary_cta_label', e.target.value)} placeholder="e.g. Join the Waitlist" /></div>
                <div><label className="label">Secondary CTA URL</label><input className="input" value={ev.ticketing_secondary_cta_url || ''} onChange={e => set('ticketing_secondary_cta_url', e.target.value)} placeholder="https://…" /></div>
              </div>
              <div><label className="label">Waitlist URL <span className="text-ink-500">(sold-out events)</span></label><input className="input" value={ev.waitlist_url || ''} onChange={e => set('waitlist_url', e.target.value)} placeholder="https://…" /></div>
              <div><label className="label">Cancellation/Refund Info URL <span className="text-ink-500">(postponed/cancelled)</span></label><input className="input" value={ev.cancellation_info_url || ''} onChange={e => set('cancellation_info_url', e.target.value)} placeholder="https://…" /></div>
            </div>

            <p className="text-xs text-ink-500">No internal checkout. Only external booking links are shown. Visitors are directed to the official booking destination or Instagram when appropriate.</p>
          </section>

          {/* Live ticketing preview */}
          <TicketingPreview ev={ev} />

          <section className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-extrabold">Publish</h2>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-synf-500" checked={!!ev.is_published} onChange={e => set('is_published', e.target.checked)} /> Published</label>
            <button onClick={() => save(false)} disabled={saving} className="btn-ghost w-full"><Save size={16} /> {saving ? 'Saving…' : 'Save draft'}</button>
            <button onClick={() => save(true)} disabled={saving} className="btn-primary w-full">Publish</button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function TicketingPreview({ ev }: { ev: Partial<EventRow> }) {
  const config = resolveTicketing(ev);

  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Eye size={16} className="text-synf-400" />
        <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-synf-400">Live Preview</h2>
      </div>
      <p className="text-xs text-ink-500">This is what visitors will see on the event page ticketing section.</p>

      {/* Warnings */}
      {config.warnings.length > 0 && (
        <div className="space-y-1">
          {config.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-gold-400/20 bg-gold-400/5 p-2 text-xs text-gold-400">
              <AlertCircle size={12} className="mt-0.5 shrink-0" /> {w}
            </div>
          ))}
        </div>
      )}

      {/* Preview panel */}
      <div className="rounded-xl border border-white/10 bg-ink-900/60 p-4">
        {config.statusBadge && (
          <span className="chip mb-3 inline-block border border-synf-500/30 bg-synf-500/15 text-[10px] uppercase text-synf-300">{config.statusBadge.replace('_', ' ')}</span>
        )}
        <h3 className="font-display text-lg font-extrabold">{config.heading}</h3>
        <p className="mt-1 text-sm text-white/60">{config.message}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {config.primary ? (
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold ${
              config.primary.variant === 'accent' ? 'bg-acid-400 text-ink-950' :
              config.primary.variant === 'disabled' ? 'border border-synf-500/40 bg-synf-500/10 text-synf-400' :
              'bg-synf-500 text-white'
            }`}>
              {config.primary.label}
              <ExternalLink size={12} />
            </span>
          ) : (
            <span className="text-xs text-ink-500">No primary CTA for this status.</span>
          )}
          {config.secondary && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80">
              {config.secondary.label}
              <ExternalLink size={12} />
            </span>
          )}
        </div>
      </div>

      {/* Additional warnings about configuration gaps */}
      {ev.status === 'announced' && ev.booking_method === 'external_link' && !ev.ticket_url && (
        <div className="flex items-start gap-2 rounded-lg border border-gold-400/20 bg-gold-400/5 p-2 text-xs text-gold-400">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> Announced with "External Booking Link" but no URL set. Visitors will see the "Bookings opening soon" message.
        </div>
      )}
      {ev.status === 'upcoming' && ev.booking_method === 'external_link' && !ev.ticket_url && (
        <div className="flex items-start gap-2 rounded-lg border border-gold-400/20 bg-gold-400/5 p-2 text-xs text-gold-400">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> Upcoming with "External Booking Link" but no URL set. Visitors will be directed to Instagram.
        </div>
      )}
      {ev.status === 'completed' && ev.aftermovie_url && (
        <div className="flex items-start gap-2 rounded-lg border border-acid-400/20 bg-acid-400/5 p-2 text-xs text-acid-400">
          <CheckCircle size={12} className="mt-0.5 shrink-0" /> Aftermovie URL detected — "Watch the Aftermovie" CTA will appear.
        </div>
      )}
      {ev.status === 'sold_out' && ev.waitlist_url && (
        <div className="flex items-start gap-2 rounded-lg border border-acid-400/20 bg-acid-400/5 p-2 text-xs text-acid-400">
          <CheckCircle size={12} className="mt-0.5 shrink-0" /> Waitlist URL detected — "Join the Waitlist" CTA will appear.
        </div>
      )}
      {ev.status === 'draft' && (
        <div className="flex items-start gap-2 rounded-lg border border-gold-400/20 bg-gold-400/5 p-2 text-xs text-gold-400">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> This event is in Draft and is not publicly visible.
        </div>
      )}
    </section>
  );
}
