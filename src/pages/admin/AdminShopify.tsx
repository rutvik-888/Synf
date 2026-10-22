import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loadShopifyConfig, validateConfig, checkShopifyConnection, DEFAULT_SHOPIFY_CONFIG, type ShopifyConfig } from '@/lib/shopify';
import { ShoppingBag, Check, AlertCircle, Loader2, ExternalLink, Save, RefreshCw, Zap } from 'lucide-react';

export function AdminShopify() {
  const [config, setConfig] = useState<ShopifyConfig>(DEFAULT_SHOPIFY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error: string | null } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const cfg = await loadShopifyConfig();
    setConfig(cfg);
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const validation = validateConfig(config);
    const data = {
      store_domain: config.store_domain,
      storefront_access_token: config.storefront_access_token,
      api_version: config.api_version,
      last_synced_at: new Date().toISOString(),
      last_error: validation.valid ? null : validation.errors.join('; '),
    };
    await supabase.from('site_content').upsert({
      slug: 'shopify_config',
      label: 'Shopify Integration',
      is_public: true,
      data,
    }, { onConflict: 'slug' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    const result = await checkShopifyConnection(config);
    setTestResult(result);
    setTesting(false);
  }

  function update<K extends keyof ShopifyConfig>(key: K, value: ShopifyConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-white/5" />;
  }

  const validation = validateConfig(config);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Shopify Integration</h1>
          <p className="text-sm text-white/50">Connect a Shopify store to enable real-time product sync and checkout.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={testConnection} disabled={!validation.valid || testing} className="btn-ghost">
            {testing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Test connection
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`mb-6 rounded-xl border p-4 ${config.is_connected ? 'border-acid-400/30 bg-acid-400/5' : 'border-white/10 bg-white/[0.02]'}`}>
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-lg ${config.is_connected ? 'bg-acid-400/15 text-acid-400' : 'bg-white/5 text-white/30'}`}>
            {config.is_connected ? <Check size={20} /> : <ShoppingBag size={20} />}
          </div>
          <div>
            <p className={`font-semibold ${config.is_connected ? 'text-acid-400' : 'text-white/60'}`}>
              {config.is_connected ? 'Connected' : 'Not configured'}
            </p>
            <p className="text-xs text-white/40">
              {config.is_connected ? `Store: ${config.store_domain}` : 'Enter your store domain and storefront access token to connect.'}
            </p>
          </div>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`mb-6 rounded-xl border p-4 ${testResult.ok ? 'border-acid-400/30 bg-acid-400/5' : 'border-synf-500/30 bg-synf-500/5'}`}>
          <div className="flex items-center gap-3">
            {testResult.ok ? <Check size={18} className="text-acid-400" /> : <AlertCircle size={18} className="text-synf-400" />}
            <p className="text-sm">{testResult.ok ? 'Connection successful — Shopify API is reachable.' : testResult.error || 'Connection failed.'}</p>
          </div>
        </div>
      )}

      {/* Configuration form */}
      <div className="space-y-5">
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Store Credentials</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Store Domain</label>
              <input
                className="input"
                placeholder="your-store.myshopify.com"
                value={config.store_domain || ''}
                onChange={e => update('store_domain', e.target.value)}
              />
              <p className="mt-1.5 text-xs text-white/40">Your Shopify store domain without https:// prefix</p>
            </div>

            <div>
              <label className="label">Storefront Access Token</label>
              <input
                className="input font-mono"
                placeholder="shpat_..."
                value={config.storefront_access_token || ''}
                onChange={e => update('storefront_access_token', e.target.value)}
                type="password"
              />
              <p className="mt-1.5 text-xs text-white/40">Public Storefront API token — safe for client-side use. Find it in Shopify Admin → Apps → Headless.</p>
            </div>

            <div>
              <label className="label">API Version</label>
              <select className="input" value={config.api_version} onChange={e => update('api_version', e.target.value)}>
                <option value="2024-10">2024-10 (Latest stable)</option>
                <option value="2024-07">2024-07</option>
                <option value="2024-04">2024-04</option>
                <option value="2024-01">2024-01</option>
              </select>
            </div>
          </div>
        </div>

        {/* Validation */}
        {!validation.valid && (
          <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 p-4">
            <div className="flex items-center gap-2 text-gold-400">
              <AlertCircle size={16} />
              <span className="text-sm font-semibold">Configuration issues:</span>
            </div>
            <ul className="mt-2 space-y-1">
              {validation.errors.map((err, i) => (
                <li key={i} className="text-xs text-white/50">• {err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Help / documentation */}
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <Zap size={18} className="mt-0.5 shrink-0 text-synf-400" />
            <div className="text-sm text-white/55">
              <p className="font-semibold text-white/70">How Shopify integration works</p>
              <ul className="mt-2 space-y-1.5">
                <li>• Products from your Shopify store can sync into Synf Goods automatically</li>
                <li>• The public storefront token is safe for browser-side catalogue reads</li>
                <li>• Checkout happens on your Shopify store — no payment processing on Synf</li>
                <li>• Admin API tokens and private credentials must stay server-side only</li>
              </ul>
              <a href="https://shopify.dev/docs/api/storefront" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-synf-400 hover:text-synf-300">
                Shopify Storefront API docs <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>

        {config.last_synced_at && (
          <p className="text-center text-xs text-white/30">
            Last updated: {new Date(config.last_synced_at).toLocaleString('en-IN')}
          </p>
        )}
      </div>
    </div>
  );
}
