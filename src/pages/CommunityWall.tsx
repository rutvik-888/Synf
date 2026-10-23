import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CommunityWallPostRow, CommunityWallCategoryRow } from '@/lib/platform-types';
import { Reveal } from '@/components/Reveal';
import { Camera, X, ChevronLeft, ChevronRight, Upload, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitPublicForm } from '@/lib/api';
import { useSeo, collectionPageJsonLd } from '@/lib/seo';

export function CommunityWall() {
  const [posts, setPosts] = useState<CommunityWallPostRow[]>([]);
  const [categories, setCategories] = useState<CommunityWallCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from('community_wall_posts').select('*, category:community_wall_categories(*)').eq('status', 'approved').order('is_featured', { ascending: false }).order('sort_order').order('created_at', { ascending: false }),
        supabase.from('community_wall_categories').select('*').eq('is_active', true).order('sort_order'),
      ]);
      setPosts((p as CommunityWallPostRow[]) || []);
      setCategories((c as CommunityWallCategoryRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = posts.filter(p => activeCat === 'all' || p.category_id === activeCat);

  useSeo({
    title: 'Community Wall — Moments from Team Synf Nights',
    description: `Browse ${posts.length} community-submitted photos and videos from Team Synf events in Hyderabad. See the nights through the eyes of the people who lived them.`,
    path: '/community',
    keywords: ['Team Synf community', 'Hyderabad party photos', 'event photos India', 'nightlife photography Hyderabad', 'community wall', 'party photos Hyderabad', 'Synf events photos'],
    jsonLd: collectionPageJsonLd('Community Wall', '/community', posts.length),
  });

  const closeLightbox = () => setLightbox(null);
  const next = () => setLightbox(i => i === null ? i : (i + 1) % filtered.length);
  const prev = () => setLightbox(i => i === null ? i : (i - 1 + filtered.length) % filtered.length);

  return (
    <div className="bg-ink-950 min-h-screen">
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-acid-400/15 to-transparent" />
          <div className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-tl from-synf-600/12 to-transparent" />
        </div>
        <div className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-acid-400/10 blur-[120px] animate-float gpu" />
        <div className="grain pointer-events-none absolute inset-0 opacity-10" />
        <div className="container-synf relative">
          <Reveal className="section-eyebrow"><Camera size={14} /> Community Wall</Reveal>
          <Reveal><h1 className="display-xl text-[clamp(2.5rem,10vw,8rem)]">The <span className="text-gradient-vibe">wall.</span></h1></Reveal>
          <Reveal delay={150}><p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">Moments from the community — photos and videos from Synf nights, submitted by the people who lived them.</p></Reveal>
          <Reveal delay={250}>
            <button onClick={() => setShowSubmit(true)} className="btn-primary mt-6 group">
              <Upload size={16} /> Submit your moment <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </Reveal>
        </div>
      </section>

      {loading ? (
        <section className="container-synf py-20"><div className="h-96 animate-pulse rounded-2xl bg-ink-900" /></section>
      ) : posts.length === 0 ? (
        <section className="container-synf py-24 text-center">
          <Reveal>
            <ImageIcon className="mx-auto h-10 w-10 text-ink-600" />
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight">No posts yet</h2>
            <p className="mx-auto mt-3 max-w-md text-white/60">The wall is waiting for your moments. Submit a photo or video from a Synf night.</p>
            <button onClick={() => setShowSubmit(true)} className="btn-primary mt-6 inline-flex group"><Upload size={16} /> Submit your moment</button>
          </Reveal>
        </section>
      ) : (
        <section className="container-synf pb-24">
          <div className="mb-8 flex flex-wrap gap-2">
            <button onClick={() => setActiveCat('all')} className={`chip border transition-all ${activeCat === 'all' ? 'border-acid-400/40 bg-acid-400/20 text-acid-400' : 'border-white/10 bg-ink-900 text-white/60 hover:text-white'}`}>All</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCat(c.id)} className={`chip border transition-all ${activeCat === c.id ? 'border-acid-400/40 bg-acid-400/20 text-acid-400' : 'border-white/10 bg-ink-900 text-white/60 hover:text-white'}`}>{c.name}</button>
            ))}
          </div>
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
            {filtered.map((p, i) => (
              <Reveal key={p.id} delay={(i % 6) * 60}>
                <button onClick={() => setLightbox(i)} className="group relative block w-full overflow-hidden rounded-xl border border-white/10 transition-all hover:border-acid-400/40">
                  {p.media_type === 'video' ? (
                    <div className="relative aspect-square">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.caption || ''} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-ink-900"><Camera size={24} className="text-white/30" /></div>
                      )}
                    </div>
                  ) : (
                    <img src={p.media_url} alt={p.caption || ''} loading="lazy" referrerPolicy="no-referrer" className="w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  {p.caption && <p className="absolute bottom-2 left-2 right-2 text-left text-xs text-white/80 opacity-0 transition-opacity group-hover:opacity-100">{p.caption}</p>}
                  {p.is_featured && <span className="absolute right-2 top-2 chip border border-acid-400/40 bg-ink-950/80 text-[9px] text-acid-400">Featured</span>}
                </button>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightbox !== null && filtered[lightbox] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/95 backdrop-blur-xl" onClick={closeLightbox}>
          <button className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={closeLightbox}><X size={20} /></button>
          <button className="absolute left-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); prev(); }}><ChevronLeft size={20} /></button>
          <button className="absolute right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); next(); }}><ChevronRight size={20} /></button>
          <div className="max-h-[85vh] max-w-4xl p-4" onClick={e => e.stopPropagation()}>
            {filtered[lightbox].media_type === 'video' ? (
              <video src={filtered[lightbox].media_url} controls className="max-h-[75vh] w-full rounded-xl" />
            ) : (
              <img src={filtered[lightbox].media_url} alt={filtered[lightbox].caption || ''} referrerPolicy="no-referrer" className="max-h-[75vh] w-full rounded-xl object-contain" />
            )}
            {filtered[lightbox].caption && <p className="mt-4 text-center text-white/70">{filtered[lightbox].caption}</p>}
            {filtered[lightbox].contributor_name && !filtered[lightbox].is_anonymous && <p className="mt-1 text-center text-sm text-white/40">By {filtered[lightbox].contributor_name}</p>}
          </div>
        </div>
      )}

      {/* Submit modal */}
      {showSubmit && <SubmitModal onClose={() => setShowSubmit(false)} categories={categories} />}
    </div>
  );
}

function SubmitModal({ onClose, categories }: { onClose: () => void; categories: CommunityWallCategoryRow[] }) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [consent, setConsent] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!mediaUrl || !consent) return;
    setStatus('loading');
    const r = await submitPublicForm({
      kind: 'community_wall',
      media_url: mediaUrl,
      media_type: 'image',
      caption,
      category_id: categoryId || null,
      contributor_name: isAnonymous ? null : contributorName,
      is_anonymous: isAnonymous,
      consent_confirmed: consent,
      contact_email: contactEmail,
    });
    if (r.error) { setStatus('err'); setMsg(r.error); }
    else { setStatus('ok'); setMsg('Submitted! Your post will appear on the wall once approved by the Synf team.'); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/95 backdrop-blur-xl p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-ink-900 p-6 sm:p-8" onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Submit your moment</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X size={16} /></button>
        </div>

        {status === 'ok' ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-acid-400" />
            <p className="mt-4 text-white/80">{msg}</p>
            <button onClick={onClose} className="btn-ghost mt-6">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Image URL *</label>
              <input className="input" required placeholder="https://…" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} />
              <p className="mt-1 text-xs text-white/40">Paste a direct link to your photo or video.</p>
            </div>
            <div><label className="label">Caption</label><input className="input" placeholder="What's happening in this moment?" value={caption} onChange={e => setCaption(e.target.value)} /></div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">Select…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="label">Your name</label><input className="input" placeholder="Shown with your post" value={contributorName} onChange={e => setContributorName(e.target.value)} disabled={isAnonymous} /></div>
            <label className="flex items-center gap-2 text-sm text-white/60"><input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="accent-acid-400" /> Post anonymously</label>
            <div><label className="label">Contact email (private, for moderation only)</label><input className="input" type="email" placeholder="your@email.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
            <label className="flex items-start gap-2 text-xs text-white/50">
              <input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-acid-400" />
              I own this content and confirm I have permission to share it. I understand submission does not guarantee publication.
            </label>
            {status === 'err' && <div className="flex items-center gap-2 rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300"><AlertCircle size={16} /> {msg}</div>}
            <button type="submit" disabled={status === 'loading'} className="btn-primary w-full group">
              {status === 'loading' ? 'Submitting…' : <>Submit <Upload size={16} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
