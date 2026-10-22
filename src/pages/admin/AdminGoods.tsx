import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { GoodsProductRow, GoodsCategoryRow } from '@/lib/platform-types';
import { GOODS_AVAILABILITY_LABELS } from '@/lib/platform-types';
import { useAuth } from '@/lib/auth';
import { Plus, ShoppingBag, Trash2, Star, Search, Edit3 } from 'lucide-react';
import { formatDate, slugify } from '@/lib/format';

export function AdminGoods() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<GoodsProductRow[]>([]);
  const [categories, setCategories] = useState<GoodsCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('goods_products').select('*, category:goods_categories(*)').order('updated_at', { ascending: false }),
      supabase.from('goods_categories').select('*').order('sort_order'),
    ]);
    setProducts((p as GoodsProductRow[]) || []);
    setCategories((c as GoodsCategoryRow[]) || []);
    setLoading(false);
  }

  async function createProduct() {
    const name = 'Untitled Product';
    const { data, error } = await supabase.from('goods_products').insert({ name, slug: `${slugify(name)}-${Date.now()}`, status: 'draft', availability_status: 'coming_soon', created_by: user?.id }).select('id').single();
    if (error || !data) return;
    navigate(`/admin/goods/${(data as { id: string }).id}`);
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return;
    await supabase.from('goods_products').delete().eq('id', id);
    load();
  }

  async function toggleFeatured(id: string, val: boolean) {
    await supabase.from('goods_products').update({ is_featured: val }).eq('id', id);
    load();
  }

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Synf Goods</h1>
          <p className="text-sm text-white/50">Manage merchandise catalogue and product listings.</p>
        </div>
        <button onClick={createProduct} className="btn-primary"><Plus size={16} /> New product</button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input className="input pl-9" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="h-48 animate-pulse rounded-xl bg-white/5" /> : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-white/50">No products yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-900">
                {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="h-full w-full object-cover" /> : <ShoppingBag size={18} className="text-white/20" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{p.name}</h3>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-white/40">
                  {p.category && <span>{p.category.name}</span>}
                  {p.price != null && <span>₹{p.price.toLocaleString('en-IN')}</span>}
                  <span>{GOODS_AVAILABILITY_LABELS[p.availability_status as keyof typeof GOODS_AVAILABILITY_LABELS] || p.availability_status}</span>
                  <span className="capitalize">{p.status}</span>
                </div>
              </div>
              <button onClick={() => toggleFeatured(p.id, !p.is_featured)} className={`grid h-8 w-8 place-items-center rounded-lg ${p.is_featured ? 'bg-gold-400/20 text-gold-400' : 'text-white/30 hover:text-white'}`}><Star size={14} /></button>
              <button onClick={() => navigate(`/admin/goods/${p.id}`)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white"><Edit3 size={12} className="mr-1 inline" />Edit</button>
              <button onClick={() => deleteProduct(p.id)} className="grid h-8 w-8 place-items-center rounded-lg text-white/30 hover:text-synf-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
