import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { FrequencyArticleRow, FrequencyCategoryRow } from '@/lib/platform-types';
import { Reveal } from '@/components/Reveal';
import { ArrowRight, ArrowLeft, Search, Clock, Calendar, X } from 'lucide-react';
import { formatDate } from '@/lib/format';

export function Frequency() {
  const [articles, setArticles] = useState<FrequencyArticleRow[]>([]);
  const [categories, setCategories] = useState<FrequencyCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: arts }, { data: cats }] = await Promise.all([
        supabase.from('frequency_articles').select('*, category:frequency_categories(*)').eq('status', 'published').order('is_pinned', { ascending: false }).order('published_at', { ascending: false }),
        supabase.from('frequency_categories').select('*').eq('is_active', true).order('sort_order'),
      ]);
      setArticles((arts as FrequencyArticleRow[]) || []);
      setCategories((cats as FrequencyCategoryRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = articles.filter(a => {
    if (activeCat !== 'all' && a.category_id !== activeCat) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const featured = articles.find(a => a.is_featured) || articles.find(a => a.is_pinned) || filtered[0];
  const rest = filtered.filter(a => a.id !== featured?.id);

  return (
    <div className="bg-ink-950 min-h-screen">
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-violet-500/18 to-transparent" />
          <div className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-tl from-acid-400/12 to-transparent" />
        </div>
        <div className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-violet-500/12 blur-[120px] animate-float gpu" />
        <div className="absolute -right-40 bottom-0 h-[25rem] w-[25rem] rounded-full bg-acid-400/10 blur-[100px] animate-float gpu" style={{ animationDelay: '5s' }} />
        <div className="grain pointer-events-none absolute inset-0 opacity-10" />
        <div className="container-synf relative">
          <Reveal className="section-eyebrow"><Clock size={14} /> Frequency</Reveal>
          <Reveal><h1 className="display-xl text-[clamp(2.5rem,10vw,8rem)]">The <span className="text-gradient-vibe">Frequency.</span></h1></Reveal>
          <Reveal delay={150}><p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">Synf's creative magazine — culture, music, events and the stories behind the nights.</p></Reveal>
        </div>
      </section>

      {loading ? (
        <section className="container-synf py-20"><div className="h-96 animate-pulse rounded-2xl bg-ink-900" /></section>
      ) : articles.length === 0 ? (
        <section className="container-synf py-24 text-center">
          <Reveal>
            <Clock className="mx-auto h-10 w-10 text-ink-600" />
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight">No articles published yet</h2>
            <p className="mx-auto mt-3 max-w-md text-white/60">Frequency is Synf's editorial space. Articles will appear here once the team publishes them.</p>
            <Link to="/" className="btn-ghost mt-6 inline-flex">Back home</Link>
          </Reveal>
        </section>
      ) : (
        <>
          {/* Featured */}
          {featured && (
            <section className="container-synf pb-12">
              <Link to={`/frequency/${featured.slug}`} className="group relative block overflow-hidden rounded-3xl">
                <div className="grid lg:grid-cols-2">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {featured.cover_image_url ? (
                      <img src={featured.cover_image_url} alt={featured.cover_image_alt || featured.title} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 via-synf-600 to-ink-950">
                        <span className="font-display text-[8rem] font-extrabold text-white/10">{featured.title.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center bg-ink-900 p-8 sm:p-12">
                    {featured.is_pinned && <span className="chip mb-4 w-fit border border-acid-400/40 bg-acid-400/15 text-acid-400">Pinned</span>}
                    {featured.category && <span className="font-mono text-xs uppercase tracking-[0.3em] text-synf-400">{featured.category.name}</span>}
                    <h2 className="mt-3 font-display text-3xl font-extrabold leading-[0.95] tracking-tight sm:text-4xl lg:text-5xl">{featured.title}</h2>
                    {featured.excerpt && <p className="mt-4 text-white/65">{featured.excerpt}</p>}
                    <div className="mt-6 flex items-center gap-4 text-sm text-white/40">
                      {featured.author_name && <span>By {featured.author_name}</span>}
                      {featured.published_at && <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(featured.published_at)}</span>}
                    </div>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-synf-400 group-hover:text-synf-300">Read story <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Filters + grid */}
          <section className="container-synf pb-24">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveCat('all')} className={`chip border transition-all ${activeCat === 'all' ? 'border-synf-500/40 bg-synf-500/20 text-synf-300' : 'border-white/10 bg-ink-900 text-white/60 hover:text-white'}`}>All</button>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setActiveCat(c.id)} className={`chip border transition-all ${activeCat === c.id ? 'border-synf-500/40 bg-synf-500/20 text-synf-300' : 'border-white/10 bg-ink-900 text-white/60 hover:text-white'}`}>{c.name}</button>
                ))}
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input className="input pl-9" placeholder="Search articles…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {rest.length === 0 ? (
              <div className="py-12 text-center text-white/40">No articles match your filter.</div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((a, i) => <Reveal key={a.id} delay={i * 80}><ArticleCard article={a} /></Reveal>)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ArticleCard({ article }: { article: FrequencyArticleRow }) {
  return (
    <Link to={`/frequency/${article.slug}`} className="group block overflow-hidden rounded-2xl border border-white/10 bg-ink-900 transition-all hover:border-violet-500/40 hover:shadow-[0_20px_60px_-20px] hover:shadow-violet-500/40">
      <div className="relative aspect-[4/3] overflow-hidden">
        {article.cover_image_url ? (
          <img src={article.cover_image_url} alt={article.cover_image_alt || article.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/30 to-ink-950">
            <span className="font-display text-6xl font-extrabold text-white/10">{article.title.charAt(0)}</span>
          </div>
        )}
        {article.category && <span className="absolute left-3 top-3 chip border border-white/20 bg-ink-950/80 text-xs backdrop-blur-sm">{article.category.name}</span>}
      </div>
      <div className="p-5">
        <h3 className="font-display text-xl font-extrabold leading-tight tracking-tight transition-colors group-hover:text-violet-300">{article.title}</h3>
        {article.excerpt && <p className="mt-2 line-clamp-2 text-sm text-white/55">{article.excerpt}</p>}
        <div className="mt-3 flex items-center gap-3 text-xs text-white/35">
          {article.author_name && <span>By {article.author_name}</span>}
          {article.published_at && <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(article.published_at)}</span>}
        </div>
      </div>
    </Link>
  );
}

export function FrequencyArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<FrequencyArticleRow | null>(null);
  const [related, setRelated] = useState<FrequencyArticleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('frequency_articles').select('*, category:frequency_categories(*)').eq('slug', slug).eq('status', 'published').maybeSingle();
      if (!data) { setLoading(false); return; }
      setArticle(data as FrequencyArticleRow);
      if ((data as FrequencyArticleRow).category_id) {
        const { data: rel } = await supabase.from('frequency_articles').select('*, category:frequency_categories(*)').eq('status', 'published').eq('category_id', (data as FrequencyArticleRow).category_id).neq('id', (data as FrequencyArticleRow).id).limit(3);
        setRelated((rel as FrequencyArticleRow[]) || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="bg-ink-950 min-h-screen" />;
  if (!article) return <NotFound />;

  return (
    <div className="bg-ink-950 min-h-screen">
      <article>
        {/* Hero */}
        <section className="relative overflow-hidden">
          {article.cover_image_url && (
            <div className="absolute inset-0">
              <img src={article.cover_image_url} alt={article.cover_image_alt || article.title} className="h-full w-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-ink-950/70 to-ink-950" />
            </div>
          )}
          <div className="container-synf relative py-20 sm:py-32">
            <Link to="/frequency" className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 hover:text-synf-400"><ArrowLeft size={14} /> Back to Frequency</Link>
            {article.category && <span className="font-mono text-xs uppercase tracking-[0.3em] text-synf-400">{article.category.name}</span>}
            <h1 className="mt-3 max-w-4xl font-display text-4xl font-extrabold leading-[0.9] tracking-tightest sm:text-6xl lg:text-7xl">{article.title}</h1>
            {article.subtitle && <p className="mt-4 max-w-2xl text-xl text-white/70">{article.subtitle}</p>}
            <div className="mt-6 flex items-center gap-4 text-sm text-white/40">
              {article.author_name && <span>By {article.author_name}</span>}
              {article.published_at && <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(article.published_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="container-synf py-12 sm:py-16">
          <div className="mx-auto max-w-3xl">
            {article.body ? (
              <div className="prose-synf whitespace-pre-wrap text-lg leading-[1.8] text-white/85">{article.body}</div>
            ) : (
              <p className="text-white/40">This article has no content yet.</p>
            )}

            {/* Gallery */}
            {article.gallery && article.gallery.length > 0 && (
              <div className="mt-12 grid gap-4 sm:grid-cols-2">
                {article.gallery.map((g, i) => (
                  <div key={i} className="overflow-hidden rounded-xl">
                    <img src={g.url} alt={g.alt || ''} className="w-full object-cover" />
                    {g.caption && <p className="mt-2 text-sm text-white/40">{g.caption}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="container-synf border-t border-white/10 py-16">
            <h2 className="mb-6 font-display text-2xl font-extrabold tracking-tight">More from {article.category?.name}</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {related.map(r => <ArticleCard key={r.id} article={r} />)}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}

function NotFound() {
  return (
    <div className="bg-ink-950 grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="font-display text-6xl font-extrabold tracking-tightest">404</h1>
        <p className="mt-4 text-white/50">Article not found.</p>
        <Link to="/frequency" className="btn-ghost mt-6 inline-flex">Back to Frequency</Link>
      </div>
    </div>
  );
}
