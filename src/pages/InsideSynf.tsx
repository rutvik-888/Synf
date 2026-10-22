import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { InsideStoryRow, InsideStoryTypeRow } from '@/lib/platform-types';
import { Reveal } from '@/components/Reveal';
import { ArrowRight, ArrowLeft, Sparkles, Calendar, Users } from 'lucide-react';
import { formatDate } from '@/lib/format';

export function InsideSynf() {
  const [stories, setStories] = useState<InsideStoryRow[]>([]);
  const [types, setTypes] = useState<InsideStoryTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>('all');

  useEffect(() => {
    (async () => {
      const [{ data: sts }, { data: tps }] = await Promise.all([
        supabase.from('inside_stories').select('*, story_type:inside_story_types(*)').eq('status', 'published').order('is_featured', { ascending: false }).order('published_at', { ascending: false }),
        supabase.from('inside_story_types').select('*').eq('is_active', true).order('sort_order'),
      ]);
      setStories((sts as InsideStoryRow[]) || []);
      setTypes((tps as InsideStoryTypeRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = stories.filter(s => activeType === 'all' || s.story_type_id === activeType);
  const featured = stories.find(s => s.is_featured) || filtered[0];
  const rest = filtered.filter(s => s.id !== featured?.id);

  return (
    <div className="bg-ink-950 min-h-screen">
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-synf-600/18 to-transparent" />
          <div className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-tl from-electric-500/12 to-transparent" />
        </div>
        <div className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-synf-500/12 blur-[120px] animate-float gpu" />
        <div className="grain pointer-events-none absolute inset-0 opacity-10" />
        <div className="container-synf relative">
          <Reveal className="section-eyebrow"><Users size={14} /> Inside Synf</Reveal>
          <Reveal><h1 className="display-xl text-[clamp(2.5rem,10vw,8rem)]">Inside the <span className="text-gradient-vibe">collective.</span></h1></Reveal>
          <Reveal delay={150}><p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">Crew spotlights, behind-the-scenes stories and production diaries from the people who build the nights.</p></Reveal>
        </div>
      </section>

      {loading ? (
        <section className="container-synf py-20"><div className="h-96 animate-pulse rounded-2xl bg-ink-900" /></section>
      ) : stories.length === 0 ? (
        <section className="container-synf py-24 text-center">
          <Reveal>
            <Users className="mx-auto h-10 w-10 text-ink-600" />
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight">No stories published yet</h2>
            <p className="mx-auto mt-3 max-w-md text-white/60">Behind-the-scenes stories will appear here once the team shares them.</p>
            <Link to="/about" className="btn-ghost mt-6 inline-flex">About Synf</Link>
          </Reveal>
        </section>
      ) : (
        <>
          {featured && (
            <section className="container-synf pb-12">
              <Link to={`/inside-synf/${featured.slug}`} className="group relative block overflow-hidden rounded-3xl">
                <div className="grid lg:grid-cols-2">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {featured.cover_image_url ? (
                      <img src={featured.cover_image_url} alt={featured.cover_image_alt || featured.title} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-synf-600 via-electric-500/30 to-ink-950">
                        <span className="font-display text-[8rem] font-extrabold text-white/10">{featured.title.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center bg-ink-900 p-8 sm:p-12">
                    {featured.is_featured && <span className="chip mb-4 w-fit border border-synf-500/40 bg-synf-500/15 text-synf-300">Featured</span>}
                    {featured.story_type && <span className="font-mono text-xs uppercase tracking-[0.3em] text-synf-400">{featured.story_type.name}</span>}
                    <h2 className="mt-3 font-display text-3xl font-extrabold leading-[0.95] tracking-tight sm:text-4xl lg:text-5xl">{featured.title}</h2>
                    {featured.summary && <p className="mt-4 text-white/65">{featured.summary}</p>}
                    {featured.published_at && <div className="mt-6 flex items-center gap-1 text-sm text-white/40"><Calendar size={12} /> {formatDate(featured.published_at)}</div>}
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-synf-400 group-hover:text-synf-300">Read story <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
                  </div>
                </div>
              </Link>
            </section>
          )}

          <section className="container-synf pb-24">
            <div className="mb-8 flex flex-wrap gap-2">
              <button onClick={() => setActiveType('all')} className={`chip border transition-all ${activeType === 'all' ? 'border-synf-500/40 bg-synf-500/20 text-synf-300' : 'border-white/10 bg-ink-900 text-white/60 hover:text-white'}`}>All</button>
              {types.map(t => (
                <button key={t.id} onClick={() => setActiveType(t.id)} className={`chip border transition-all ${activeType === t.id ? 'border-synf-500/40 bg-synf-500/20 text-synf-300' : 'border-white/10 bg-ink-900 text-white/60 hover:text-white'}`}>{t.name}</button>
              ))}
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((s, i) => <Reveal key={s.id} delay={i * 80}><StoryCard story={s} /></Reveal>)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StoryCard({ story }: { story: InsideStoryRow }) {
  return (
    <Link to={`/inside-synf/${story.slug}`} className="group block overflow-hidden rounded-2xl border border-white/10 bg-ink-900 transition-all hover:border-synf-500/40 hover:shadow-[0_20px_60px_-20px] hover:shadow-synf-500/40">
      <div className="relative aspect-[4/3] overflow-hidden">
        {story.cover_image_url ? (
          <img src={story.cover_image_url} alt={story.cover_image_alt || story.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-synf-600/30 to-ink-950">
            <span className="font-display text-6xl font-extrabold text-white/10">{story.title.charAt(0)}</span>
          </div>
        )}
        {story.story_type && <span className="absolute left-3 top-3 chip border border-white/20 bg-ink-950/80 text-xs backdrop-blur-sm">{story.story_type.name}</span>}
      </div>
      <div className="p-5">
        <h3 className="font-display text-xl font-extrabold leading-tight tracking-tight transition-colors group-hover:text-synf-400">{story.title}</h3>
        {story.summary && <p className="mt-2 line-clamp-2 text-sm text-white/55">{story.summary}</p>}
        {story.published_at && <div className="mt-3 flex items-center gap-1 text-xs text-white/35"><Calendar size={10} /> {formatDate(story.published_at)}</div>}
      </div>
    </Link>
  );
}

export function InsideStoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [story, setStory] = useState<InsideStoryRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('inside_stories').select('*, story_type:inside_story_types(*)').eq('slug', slug).eq('status', 'published').maybeSingle();
      setStory(data as InsideStoryRow | null);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="bg-ink-950 min-h-screen" />;
  if (!story) return (
    <div className="bg-ink-950 grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="font-display text-6xl font-extrabold tracking-tightest">404</h1>
        <p className="mt-4 text-white/50">Story not found.</p>
        <Link to="/inside-synf" className="btn-ghost mt-6 inline-flex">Back to Inside Synf</Link>
      </div>
    </div>
  );

  return (
    <div className="bg-ink-950 min-h-screen">
      <article>
        <section className="relative overflow-hidden">
          {story.cover_image_url && (
            <div className="absolute inset-0">
              <img src={story.cover_image_url} alt={story.cover_image_alt || story.title} className="h-full w-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-ink-950/70 to-ink-950" />
            </div>
          )}
          <div className="container-synf relative py-20 sm:py-32">
            <Link to="/inside-synf" className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 hover:text-synf-400"><ArrowLeft size={14} /> Back to Inside Synf</Link>
            {story.story_type && <span className="font-mono text-xs uppercase tracking-[0.3em] text-synf-400">{story.story_type.name}</span>}
            <h1 className="mt-3 max-w-4xl font-display text-4xl font-extrabold leading-[0.9] tracking-tightest sm:text-6xl lg:text-7xl">{story.title}</h1>
            {story.summary && <p className="mt-4 max-w-2xl text-xl text-white/70">{story.summary}</p>}
            <div className="mt-6 flex items-center gap-4 text-sm text-white/40">
              {story.published_at && <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(story.published_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
            </div>
          </div>
        </section>

        <section className="container-synf py-12 sm:py-16">
          <div className="mx-auto max-w-3xl">
            {story.body ? (
              <div className="prose-synf whitespace-pre-wrap text-lg leading-[1.8] text-white/85">{story.body}</div>
            ) : (
              <p className="text-white/40">This story has no content yet.</p>
            )}

            {story.contributor_credits && story.contributor_credits.length > 0 && (
              <div className="mt-12 border-t border-white/10 pt-8">
                <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">Credits</h3>
                <div className="mt-4 flex flex-wrap gap-4">
                  {story.contributor_credits.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                      <Sparkles size={12} className="text-synf-400" /> {c.name}{c.role ? ` — ${c.role}` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {story.gallery && story.gallery.length > 0 && (
              <div className="mt-12 grid gap-4 sm:grid-cols-2">
                {story.gallery.map((g, i) => (
                  <div key={i} className="overflow-hidden rounded-xl">
                    <img src={g.url} alt={g.alt || ''} className="w-full object-cover" />
                    {g.caption && <p className="mt-2 text-sm text-white/40">{g.caption}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </article>
    </div>
  );
}
