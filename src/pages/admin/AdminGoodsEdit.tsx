import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Trash2, Plus, X, Eye, ArrowLeft, AlertCircle, ShoppingBag, ExternalLink, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { GoodsProductRow, GoodsCategoryRow, GoodsVariantRow, GoodsAvailability } from '@/lib/platform-types';
import { GOODS_AVAILABILITY_LABELS } from '@/lib/platform-types';
import { slugify } from '@/lib/format';
import { MediaUploader, type MediaItem } from '@/components/MediaUploader';

const AVAILABILITY_OPTIONS: GoodsAvailability[] = ['coming_soon', 'available', 'limited', 'sold_out', 'discontinued'];

function productImagesToMedia(images: GoodsProductRow['images']): MediaItem[] {
  if (!images || images.length === 0) return [];
  return images.map(img => ({ url: img.url, type: 'image' as const, source_type: 'url' as const, alt: img.alt || null }));
}

function mediaToProductImages(items: MediaItem[]): GoodsProductRow['images'] {
  return items.map(it => ({ url: it.url, alt: it.alt || undefined }));
}

export function AdminGoodsEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === 'new' || !id;

  const [product, setProduct] = useState<Partial<GoodsProductRow>>({
    name: '', slug: '', description: '', category_id: null, price: null, currency: 'INR',
    availability_status: 'coming_soon', external_purchase_url: '', tags: [], is_featured: false,
    status: 'draft', images: [],
  });
  const [categories, setCategories] = useState<GoodsCategoryRow[]>([]);
  const [gallery, setGallery] = useState<MediaItem[]>([]);
  const [variants, setVariants] = useState<GoodsVariantRow[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from('goods_categories').select('*').order('sort_order');
      setCategories((cats as GoodsCategoryRow[]) || []);
      if (isNew) { setLoading(false); return; }
      const { data } = await supabase.from('goods_products').select('*').eq('id', id).maybeSingle();
      if (!data) { setErr('Product not found'); setLoading(false); return; }
      const p = data as GoodsProductRow;
      setProduct(p);
      setGallery(productImagesToMedia(p.images));
      setTagsInput((p.tags || []).join(', '));
      const { data: vRows } = await supabase.from('goods_variants').select('*').eq('product_id', p.id).order('sort_order');
      setVariants((vRows as GoodsVariantRow[]) || []);
      setLoading(false);
    })();
  }, [id, isNew]);

  const set = useCallback(<K extends keyof GoodsProductRow>(k: K, v: GoodsProductRow[K]) => {
    setProduct(prev => ({ ...prev, [k]: v }));
  }, []);

  const onGalleryChange = useCallback((val: MediaItem | MediaItem[] | null) => {
    setGallery(Array.isArray(val) ? val : val ? [val] : []);
  }, []);

  async function save(publish = false) {
    setErr(''); setSaving(true);
    if (!product.name) { setErr('Name is required'); setSaving(false); return; }

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      ...product,
      slug: product.slug || slugify(product.name),
      images: mediaToProductImages(gallery),
      tags,
      status: publish ? 'published' : product.status,
      published_at: publish && !product.published_at ? new Date().toISOString() : product.published_at,
      updated_at: new Date().toISOString(),
    } as GoodsProductRow;

    if (!payload.slug) { setErr('Slug is required'); setSaving(false); return; }

    let recordId = id;
    if (isNew) {
      payload.created_by = user?.id ?? null;
      const { data, error } = await supabase.from('goods_products').insert(payload).select('id').single();
      if (error) { setErr(error.message); setSaving(false); return; }
      recordId = (data as { id: string }).id;
      navigate(`/admin/goods/${recordId}`, { replace: true });
    } else {
      const { error } = await supabase.from('goods_products').update(payload).eq('id', id!);
      if (error) { setErr(error.message); setSaving(false); return; }
    }

    // Sync variants
    await supabase.from('goods_variants').delete().eq('product_id', recordId);
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.variant_value) continue;
      await supabase.from('goods_variants').insert({
        product_id: recordId,
        variant_type: v.variant_type || 'generic',
        variant_value: v.variant_value,
        sort_order: i,
      });
    }

    setSaving(false);
    if (publish) navigate('/admin/goods');
  }

  async function del() {
    if (!id || isNew) return;
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const { error } = await supabase.from('goods_products').delete().eq('id', id);
    if (error) { setErr(error.message); return; }
    navigate('/admin/goods');
  }

  function addVariant() {
    setVariants(v => [...v, { id: 'new_' + Date.now(), product_id: id || '', variant_type: 'size', variant_value: '', sort_order: v.length } as GoodsVariantRow]);
  }

  async function createCategory() {
    const name = prompt('Category name:');
    if (!name) return;
    const { data } = await supabase.from('goods_categories').insert({ name, slug: `${slugify(name)}-${Date.now().toString().slice(-4)}`, is_active: true, sort_order: categories.length }).select('*').single();
    if (data) setCategories([...categories, data as GoodsCategoryRow]);
  }

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-ink-900" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/goods" className="mb-2 inline-flex items-center gap-1 text-sm text-white/50 hover:text-synf-400"><ArrowLeft size={14} /> Goods</Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{isNew ? 'New product' : product.name || 'Product'}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew && product.slug && <a href={`/goods/${product.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost"><Eye size={16} /> Preview</a>}
          {!isNew && <button onClick={del} className="btn-ghost text-synf-400 hover:bg-synf-500/10"><Trash2 size={16} /></button>}
        </div>
      </div>

      {err && <div className="rounded-lg border border-synf-500/30 bg-synf-500/10 p-3 text-sm text-synf-300">{err}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Basics */}
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-extrabold">Basics</h2>
            <div><label className="label">Name *</label><input className="input" value={product.name || ''} onChange={e => { set('name', e.target.value); if (isNew) set('slug', slugify(e.target.value)); }} /></div>
            <div><label className="label">Slug</label><input className="input" value={product.slug || ''} onChange={e => set('slug', e.target.value)} placeholder="url-friendly-id" /></div>
            <div><label className="label">Description</label><textarea className="input min-h-[100px]" value={product.description || ''} onChange={e => set('description', e.target.value)} /></div>
            <div><label className="label">Tags (comma separated)</label><input className="input" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="tee, limited, summer" /></div>
          </section>

          {/* Images */}
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-extrabold">Product images</h2>
            <p className="text-sm text-ink-500">Upload product photos. The first image is used as the thumbnail on the goods page. Drag to reorder.</p>
            <MediaUploader
              value={gallery}
              onChange={onGalleryChange}
              multiple
              accept={['image']}
              bucket="event-media"
              pathPrefix={`goods/${product.slug || id || 'new'}`}
              maxFileSizeMB={10}
              label="Drag images here or click to browse"
              aspectRatio="4/5"
              allowUrl
              showMetadata
            />
          </section>

          {/* Variants */}
          <section className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold">Variants</h2>
              <button onClick={addVariant} className="btn-outline py-1.5"><Plus size={14} /> Add</button>
            </div>
            <p className="text-sm text-ink-500">Optional — sizes, colours, materials. Shown on the product page as selectable chips.</p>
            {variants.length === 0 && <p className="text-sm text-ink-500">No variants yet.</p>}
            {variants.map(v => (
              <div key={v.id} className="grid gap-2 rounded-lg border border-white/5 p-3 sm:grid-cols-3">
                <select className="input" value={v.variant_type} onChange={e => setVariants(arr => arr.map(x => x.id === v.id ? { ...x, variant_type: e.target.value } : x))}>
                  <option value="size">Size</option>
                  <option value="color">Colour</option>
                  <option value="material">Material</option>
                  <option value="generic">Generic</option>
                </select>
                <input className="input" placeholder="Value (e.g. M, Black)" value={v.variant_value} onChange={e => setVariants(arr => arr.map(x => x.id === v.id ? { ...x, variant_value: e.target.value } : x))} />
                <button onClick={() => setVariants(arr => arr.filter(x => x.id !== v.id))} className="btn-ghost text-synf-400"><X size={14} /></button>
              </div>
            ))}
          </section>
        </div>

        <aside className="space-y-4">
          {/* Pricing & availability */}
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-extrabold">Pricing & availability</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Price</label>
                <input className="input" type="number" min="0" step="0.01" value={product.price ?? ''} onChange={e => set('price', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0" />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={product.currency || 'INR'} onChange={e => set('currency', e.target.value)}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Availability</label>
              <select className="input" value={product.availability_status || 'coming_soon'} onChange={e => set('availability_status', e.target.value as GoodsAvailability)}>
                {AVAILABILITY_OPTIONS.map(o => <option key={o} value={o}>{GOODS_AVAILABILITY_LABELS[o]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">External purchase URL</label>
              <input className="input" value={product.external_purchase_url || ''} onChange={e => set('external_purchase_url', e.target.value)} placeholder="https://… (shown when availability is Available)" />
              {product.external_purchase_url && !product.external_purchase_url.startsWith('https://') && (
                <p className="mt-1 text-xs text-gold-400">URL should use HTTPS for security.</p>
              )}
            </div>
          </section>

          {/* Category */}
          <section className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold">Category</h2>
              <button onClick={createCategory} className="btn-outline py-1.5 text-xs"><Plus size={12} /> New</button>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={product.category_id || ''} onChange={e => set('category_id', e.target.value || null)}>
                <option value="">Uncategorised</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-ember-500" checked={!!product.is_featured} onChange={e => set('is_featured', e.target.checked)} />
              <Star size={14} className="text-gold-400" /> Featured on goods page
            </label>
          </section>

          {/* Publish */}
          <section className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-extrabold">Publish</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-synf-500" checked={product.status === 'published'} onChange={e => set('status', e.target.checked ? 'published' : 'draft')} />
              Published
            </label>
            <button onClick={() => save(false)} disabled={saving} className="btn-ghost w-full"><Save size={16} /> {saving ? 'Saving…' : 'Save draft'}</button>
            <button onClick={() => save(true)} disabled={saving} className="btn-primary w-full">Publish</button>
          </section>

          {/* Live preview */}
          {!isNew && product.status === 'published' && product.slug && (
            <a href={`/goods/${product.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost flex w-full items-center justify-center gap-2 text-sm">
              <ExternalLink size={14} /> View live product page
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
