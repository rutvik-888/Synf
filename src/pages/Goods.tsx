import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { GoodsProductRow, GoodsCategoryRow } from '@/lib/platform-types';
import { GOODS_AVAILABILITY_LABELS } from '@/lib/platform-types';
import { loadShopifyConfig, type ShopifyConfig } from '@/lib/shopify';
import { Reveal } from '@/components/Reveal';
import { ParticleField } from '@/components/ParticleField';
import { ShoppingBag, ArrowRight, ArrowLeft, Calendar, ExternalLink, Search, ChevronDown, Check, AlertCircle, Tag } from 'lucide-react';
import { formatDate } from '@/lib/format';

const AVAILABILITY_STYLES: Record<string, string> = {
  coming_soon: 'border-gold-400/40 bg-gold-400/15 text-gold-400',
  available: 'border-acid-400/40 bg-acid-400/15 text-acid-400',
  limited: 'border-synf-500/40 bg-synf-500/15 text-synf-300',
  sold_out: 'border-white/10 bg-white/5 text-white/40',
  discontinued: 'border-white/10 bg-white/5 text-white/30',
};

type SortOption = 'newest' | 'featured' | 'price_low' | 'price_high';

export function Goods() {
  const [products, setProducts] = useState<GoodsProductRow[]>([]);
  const [categories, setCategories] = useState<GoodsCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('featured');
  const [shopifyCfg, setShopifyCfg] = useState<ShopifyConfig | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: c }, cfg] = await Promise.all([
        supabase.from('goods_products').select('*, category:goods_categories(*)').eq('status', 'published').order('is_featured', { ascending: false }).order('published_at', { ascending: false }),
        supabase.from('goods_categories').select('*').eq('is_active', true).order('sort_order'),
        loadShopifyConfig(),
      ]);
      setProducts((p as GoodsProductRow[]) || []);
      setCategories((c as GoodsCategoryRow[]) || []);
      setShopifyCfg(cfg);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      if (activeCat !== 'all' && p.category_id !== activeCat) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    switch (sort) {
      case 'newest':
        result = [...result].sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
        break;
      case 'price_low':
        result = [...result].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        break;
      case 'price_high':
        result = [...result].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
        break;
      case 'featured':
      default:
        result = [...result].sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
        break;
    }
    return result;
  }, [products, activeCat, search, sort]);

  return (
    <div className="bg-ink-950 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-28">
        <div className="absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-ember-500/15 to-transparent" />
          <div className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-tl from-gold-400/10 to-transparent" />
        </div>
        <div className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-ember-500/8 blur-[140px] animate-float gpu" />
        <ParticleField density="low" interactive colorPalette="mono" />
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.08]" />
        <div className="container-synf relative">
          <Reveal className="section-eyebrow"><ShoppingBag size={14} /> Synf Goods</Reveal>
          <Reveal>
            <h1 className="display-xl text-[clamp(2.5rem,10vw,8rem)]">
              Synf <span className="text-gradient-vibe">Goods.</span>
            </h1>
          </Reveal>
          <Reveal delay={150}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              Wear the collective. Tees, stickers, posters and limited drops — straight from Team Synf.
            </p>
          </Reveal>

          {/* Shopify connection indicator */}
          {shopifyCfg && (
            <Reveal delay={250}>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/60 px-4 py-2 text-xs">
                <span className={`h-2 w-2 rounded-full ${shopifyCfg.is_connected ? 'bg-acid-400' : 'bg-white/20'}`} />
                <span className="font-mono uppercase tracking-widest text-white/40">
                  {shopifyCfg.is_connected ? 'Shopify connected' : 'Local catalogue'}
                </span>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {loading ? (
        <section className="container-synf py-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-ink-900" />
            ))}
          </div>
        </section>
      ) : products.length === 0 ? (
        <section className="container-synf py-24 text-center">
          <Reveal>
            <div className="relative mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl border border-white/10 bg-ink-900">
              <ShoppingBag className="h-8 w-8 text-white/20" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-ember-500/10 to-transparent" />
            </div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">No products available yet</h2>
            <p className="mx-auto mt-3 max-w-md text-white/60">Synf Goods will appear here when the team launches merchandise. Follow @team.synf for drop announcements.</p>
            <a href="https://www.instagram.com/team.synf/" target="_blank" rel="noopener noreferrer" className="btn-ghost mt-6 inline-flex">@team.synf</a>
          </Reveal>
        </section>
      ) : (
        <section className="container-synf pb-24">
          {/* Controls bar */}
          <div className="mb-10 flex flex-col gap-4 border-b border-white/5 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCat('all')}
                className={`chip border transition-all ${activeCat === 'all' ? 'border-ember-500/40 bg-ember-500/20 text-ember-400' : 'border-white/10 bg-ink-900 text-white/60 hover:text-white'}`}
              >
                All
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`chip border transition-all ${activeCat === c.id ? 'border-ember-500/40 bg-ember-500/20 text-ember-400' : 'border-white/10 bg-ink-900 text-white/60 hover:text-white'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input className="input pl-9" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="relative">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortOption)}
                  className="appearance-none rounded-xl border border-ink-600 bg-ink-900/80 py-3 pl-4 pr-10 text-sm text-white/70 focus:border-synf-400 focus:outline-none"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
              </div>
            </div>
          </div>

          {/* Product grid */}
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-white/40">
              <p>No products match your filter.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p, i) => <Reveal key={p.id} delay={(i % 3) * 80}><ProductCard product={p} /></Reveal>)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: GoodsProductRow }) {
  const img = product.images?.[0]?.url;
  const hasMultipleImages = (product.images?.length || 0) > 1;

  return (
    <Link
      to={`/goods/${product.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-ink-900 transition-all duration-500 hover:border-ember-500/40 hover:shadow-[0_24px_80px_-24px] hover:shadow-ember-500/30"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {img ? (
          <>
            <img
              src={img}
              alt={product.images?.[0]?.alt || product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
            />
            {hasMultipleImages && (
              <div className="absolute bottom-3 right-3 rounded-full bg-ink-950/80 px-2.5 py-1 text-[10px] font-mono text-white/60 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                +{(product.images?.length || 0) - 1} more
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ember-500/15 to-ink-950">
            <ShoppingBag size={48} className="text-white/10 transition-transform duration-500 group-hover:scale-110" />
          </div>
        )}

        {/* Top labels */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          <span className={`chip border text-[10px] backdrop-blur-sm ${AVAILABILITY_STYLES[product.availability_status] || AVAILABILITY_STYLES.coming_soon}`}>
            {GOODS_AVAILABILITY_LABELS[product.availability_status as keyof typeof GOODS_AVAILABILITY_LABELS] || product.availability_status}
          </span>
        </div>
        {product.is_featured && (
          <span className="absolute right-3 top-3 chip border border-gold-400/40 bg-ink-950/80 text-[9px] text-gold-400 backdrop-blur-sm">
            Featured
          </span>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute bottom-4 left-4 right-4 flex translate-y-4 items-center justify-between opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="text-xs font-semibold uppercase tracking-widest text-white">View product</span>
          <ArrowRight size={16} className="text-ember-400" />
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg font-extrabold leading-tight tracking-tight transition-colors duration-300 group-hover:text-ember-400">
          {product.name}
        </h3>
        {product.description && <p className="mt-1 line-clamp-2 text-sm text-white/45">{product.description}</p>}
        <div className="mt-3 flex items-center justify-between">
          {product.price != null ? (
            <p className="font-display text-lg font-bold text-white">
              ₹{product.price.toLocaleString('en-IN')}
              {product.currency && product.currency !== 'INR' && <span className="ml-1 text-xs text-white/40">{product.currency}</span>}
            </p>
          ) : (
            <p className="text-sm text-white/30">Price on release</p>
          )}
          {product.category && (
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-white/30">
              <Tag size={9} /> {product.category.name}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function GoodsProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<GoodsProductRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('goods_products').select('*, category:goods_categories(*), variants:goods_variants(*)').eq('slug', slug).eq('status', 'published').maybeSingle();
      setProduct(data as GoodsProductRow | null);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="bg-ink-950 min-h-screen" />;
  if (!product) return (
    <div className="bg-ink-950 grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="font-display text-6xl font-extrabold tracking-tightest">404</h1>
        <p className="mt-4 text-white/50">Product not found.</p>
        <Link to="/goods" className="btn-ghost mt-6 inline-flex">Back to Goods</Link>
      </div>
    </div>
  );

  const images = product.images || [];
  const variants = product.variants || [];
  const availabilityStyle = AVAILABILITY_STYLES[product.availability_status] || AVAILABILITY_STYLES.coming_soon;
  const availabilityLabel = GOODS_AVAILABILITY_LABELS[product.availability_status as keyof typeof GOODS_AVAILABILITY_LABELS] || product.availability_status;

  return (
    <div className="bg-ink-950 min-h-screen">
      <section className="container-synf py-12 sm:py-16">
        <Link to="/goods" className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-ember-400">
          <ArrowLeft size={14} /> Back to Goods
        </Link>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Image gallery */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10">
              {images[activeImg]?.url ? (
                <img
                  src={images[activeImg].url}
                  alt={images[activeImg]?.alt || product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ember-500/15 to-ink-950">
                  <ShoppingBag size={80} className="text-white/10" />
                </div>
              )}
              {product.is_featured && (
                <span className="absolute right-4 top-4 chip border border-gold-400/40 bg-ink-950/80 text-xs text-gold-400 backdrop-blur-sm">
                  Featured
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-4 flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 transition-all duration-300 ${i === activeImg ? 'border-ember-500' : 'border-white/10 hover:border-white/30'}`}
                  >
                    <img src={img.url} alt={img.alt || ''} className="h-full w-full object-cover" />
                    {i === activeImg && <div className="absolute inset-0 bg-ember-500/10" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col justify-center">
            {product.category && (
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-ember-400">{product.category.name}</span>
            )}
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.9] tracking-tightest sm:text-5xl lg:text-6xl">
              {product.name}
            </h1>

            <div className="mt-4 flex items-center gap-4">
              {product.price != null && (
                <p className="font-display text-3xl font-bold text-white">
                  ₹{product.price.toLocaleString('en-IN')}
                  {product.currency && product.currency !== 'INR' && <span className="ml-2 text-base font-normal text-white/40">{product.currency}</span>}
                </p>
              )}
              <span className={`chip border ${availabilityStyle}`}>{availabilityLabel}</span>
            </div>

            {product.description && (
              <p className="mt-6 text-lg leading-relaxed text-white/70">{product.description}</p>
            )}

            {/* Variants */}
            {variants.length > 0 && (
              <div className="mt-6">
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Variants</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {variants.map(v => (
                    <span key={v.id} className="chip border border-white/15 bg-white/5 text-sm">{v.variant_value}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase CTA */}
            <div className="mt-8">
              {product.external_purchase_url && product.availability_status === 'available' ? (
                <a href={product.external_purchase_url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-lg group">
                  Buy now <ExternalLink size={16} className="transition-transform group-hover:translate-x-0.5" />
                </a>
              ) : product.availability_status === 'coming_soon' ? (
                <div className="flex items-center gap-3 rounded-xl border border-gold-400/30 bg-gold-400/10 p-4 text-gold-400">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="text-sm">Coming soon — follow @team.synf for drop announcements</span>
                </div>
              ) : product.availability_status === 'sold_out' ? (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-white/40">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="text-sm">Sold out</span>
                </div>
              ) : product.availability_status === 'limited' ? (
                <div className="flex items-center gap-3 rounded-xl border border-synf-500/30 bg-synf-500/10 p-4 text-synf-300">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="text-sm">Limited availability — check back soon</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-white/40">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="text-sm">Not available</span>
                </div>
              )}
            </div>

            {/* Meta */}
            {product.published_at && (
              <p className="mt-6 flex items-center gap-1.5 text-xs text-white/30">
                <Calendar size={10} /> Listed {formatDate(product.published_at)}
              </p>
            )}
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-16 grid gap-4 border-t border-white/5 pt-8 sm:grid-cols-3">
          {[
            { icon: Check, label: 'Official Team Synf merchandise' },
            { icon: Tag, label: 'Limited drops, designed in-house' },
            { icon: ArrowRight, label: 'Follow @team.synf for restock alerts' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-3 text-sm text-white/50">
                <Icon size={16} className="text-ember-400" /> {item.label}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
