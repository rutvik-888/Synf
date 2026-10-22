/**
 * Shopify integration service — architecture for future Storefront API connection.
 *
 * This module provides a clean, modular interface for connecting a Shopify store.
 * It is NOT connected by default. Until credentials are configured via admin settings
 * and server-side environment variables, all operations return a "not connected" status.
 *
 * Security model:
 * - Public Storefront API tokens may be stored in site_content (read-only catalogue access).
 * - Admin API access tokens and private credentials must live in server-side env vars only.
 * - This client-side module never handles Admin API tokens or checkout creation.
 * - Purchase is handled via external purchase links or Shopify checkout handoff URLs.
 */

import { supabase } from './supabase';

export type ShopifyConnectionStatus = 'not_configured' | 'connected' | 'error';

export type ShopifyConfig = {
  store_domain: string | null;
  storefront_access_token: string | null;
  api_version: string;
  is_connected: boolean;
  last_synced_at: string | null;
  last_error: string | null;
};

export const SHOPIFY_API_VERSION = '2024-10';

export const DEFAULT_SHOPIFY_CONFIG: ShopifyConfig = {
  store_domain: null,
  storefront_access_token: null,
  api_version: SHOPIFY_API_VERSION,
  is_connected: false,
  last_synced_at: null,
  last_error: null,
};

export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  product_type: string;
  vendor: string;
  tags: string[];
  featured_image: { url: string; alt: string } | null;
  images: Array<{ url: string; alt: string }>;
  variants: Array<{
    id: string;
    title: string;
    price: { amount: string; currencyCode: string };
    available: boolean;
  }>;
  available: boolean;
  price_range: { min: { amount: string; currencyCode: string }; max: { amount: string; currencyCode: string } };
  online_store_url: string | null;
};

export type ShopifyCollection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  products_count: number;
};

/**
 * Load Shopify configuration from the database (site_content).
 * Public storefront tokens are stored here; admin tokens are server-side only.
 */
export async function loadShopifyConfig(): Promise<ShopifyConfig> {
  const { data } = await supabase
    .from('site_content')
    .select('data, is_public')
    .eq('slug', 'shopify_config')
    .maybeSingle();

  if (!data) return DEFAULT_SHOPIFY_CONFIG;

  const cfg = { ...DEFAULT_SHOPIFY_CONFIG, ...(data.data as Record<string, unknown>) } as ShopifyConfig;
  // is_connected is determined by having both domain and token
  cfg.is_connected = !!(cfg.store_domain && cfg.storefront_access_token);
  return cfg;
}

/**
 * Validate that the Shopify configuration is usable.
 * Returns a health check result without making a full API call.
 */
export function validateConfig(cfg: ShopifyConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!cfg.store_domain) errors.push('Store domain is not configured');
  if (!cfg.storefront_access_token) errors.push('Storefront access token is not configured');
  if (cfg.store_domain && !cfg.store_domain.match(/^[a-z0-9-]+\.myshopify\.com$/i) && !cfg.store_domain.match(/^https?:\/\//)) {
    errors.push('Store domain format is invalid (expected e.g. "store.myshopify.com")');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Fetch the Shopify Storefront API endpoint.
 * Only called when config is valid. Uses public storefront token.
 */
async function shopifyFetch<T>(cfg: ShopifyConfig, query: string, variables?: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  if (!cfg.store_domain || !cfg.storefront_access_token) {
    return { data: null, error: 'Shopify is not configured' };
  }

  const domain = cfg.store_domain.startsWith('http') ? cfg.store_domain : `https://${cfg.store_domain}`;
  const url = `${domain}/api/${cfg.api_version}/graphql.json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': cfg.storefront_access_token,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { data: null, error: `Shopify API returned ${res.status}` };
    }

    const json = await res.json();
    if (json.errors) {
      return { data: null, error: json.errors.map((e: { message: string }) => e.message).join(', ') };
    }

    return { data: json.data as T, error: null };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { data: null, error: 'Request timed out' };
    }
    return { data: null, error: 'Failed to connect to Shopify' };
  }
}

/**
 * Retrieve products from Shopify Storefront API.
 */
export async function fetchShopifyProducts(cfg: ShopifyConfig, limit = 50): Promise<{ products: ShopifyProduct[]; error: string | null }> {
  const query = `
    query Products($limit: Int!) {
      products(first: $limit, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            handle
            title
            description
            productType
            vendor
            tags
            featuredImage { url altText }
            images(first: 10) { edges { node { url altText } } }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  price { amount currencyCode }
                  availableForSale
                }
              }
            }
            availableForSale
            priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
            onlineStoreUrl
          }
        }
      }
    }
  `;

  const { data, error } = await shopifyFetch<{ products: { edges: Array<{ node: Record<string, unknown> }> } }>(cfg, query, { limit });
  if (error || !data) return { products: [], error };

  const products = data.products.edges.map((edge) => {
    const n = edge.node;
    return {
      id: n.id as string,
      handle: n.handle as string,
      title: n.title as string,
      description: n.description as string,
      product_type: n.productType as string,
      vendor: n.vendor as string,
      tags: n.tags as string[],
      featured_image: n.featuredImage ? { url: (n.featuredImage as { url: string }).url, alt: (n.featuredImage as { altText: string }).altText || '' } : null,
      images: ((n.images as { edges: Array<{ node: { url: string; altText: string } }> }).edges).map(e => ({ url: e.node.url, alt: e.node.altText || '' })),
      variants: ((n.variants as { edges: Array<{ node: Record<string, unknown> }> }).edges).map(e => ({
        id: e.node.id as string,
        title: e.node.title as string,
        price: e.node.price as { amount: string; currencyCode: string },
        available: e.node.availableForSale as boolean,
      })),
      available: n.availableForSale as boolean,
      price_range: n.priceRange as { min: { amount: string; currencyCode: string }; max: { amount: string; currencyCode: string } },
      online_store_url: n.onlineStoreUrl as string | null,
    } as ShopifyProduct;
  });

  return { products, error: null };
}

/**
 * Retrieve a single product by handle.
 */
export async function fetchShopifyProduct(cfg: ShopifyConfig, handle: string): Promise<{ product: ShopifyProduct | null; error: string | null }> {
  const query = `
    query Product($handle: String!) {
      productByHandle(handle: $handle) {
        id
        handle
        title
        description
        productType
        vendor
        tags
        featuredImage { url altText }
        images(first: 10) { edges { node { url altText } } }
        variants(first: 20) {
          edges {
            node {
              id
              title
              price { amount currencyCode }
              availableForSale
            }
          }
        }
        availableForSale
        priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
        onlineStoreUrl
      }
    }
  `;

  const { data, error } = await shopifyFetch<{ productByHandle: Record<string, unknown> | null }>(cfg, query, { handle });
  if (error || !data?.productByHandle) return { product: null, error };

  const n = data.productByHandle;
  const product: ShopifyProduct = {
    id: n.id as string,
    handle: n.handle as string,
    title: n.title as string,
    description: n.description as string,
    product_type: n.productType as string,
    vendor: n.vendor as string,
    tags: n.tags as string[],
    featured_image: n.featuredImage ? { url: (n.featuredImage as { url: string }).url, alt: (n.featuredImage as { altText: string }).altText || '' } : null,
    images: ((n.images as { edges: Array<{ node: { url: string; altText: string } }> }).edges).map(e => ({ url: e.node.url, alt: e.node.altText || '' })),
    variants: ((n.variants as { edges: Array<{ node: Record<string, unknown> }> }).edges).map(e => ({
      id: e.node.id as string,
      title: e.node.title as string,
      price: e.node.price as { amount: string; currencyCode: string },
      available: e.node.availableForSale as boolean,
    })),
    available: n.availableForSale as boolean,
    price_range: n.priceRange as { min: { amount: string; currencyCode: string }; max: { amount: string; currencyCode: string } },
    online_store_url: n.onlineStoreUrl as string | null,
  };

  return { product, error: null };
}

/**
 * Retrieve collections from Shopify.
 */
export async function fetchShopifyCollections(cfg: ShopifyConfig): Promise<{ collections: ShopifyCollection[]; error: string | null }> {
  const query = `
    query Collections {
      collections(first: 50) {
        edges {
          node {
            id
            handle
            title
            description
            productsCount
          }
        }
      }
    }
  `;

  const { data, error } = await shopifyFetch<{ collections: { edges: Array<{ node: Record<string, unknown> }> } }>(cfg, query);
  if (error || !data) return { collections: [], error };

  const collections = data.collections.edges.map(edge => ({
    id: edge.node.id as string,
    handle: edge.node.handle as string,
    title: edge.node.title as string,
    description: edge.node.description as string,
    products_count: edge.node.productsCount as number,
  }));

  return { collections, error: null };
}

/**
 * Format a price amount with currency.
 */
export function formatShopifyPrice(amount: string, currencyCode: string, locale = 'en-IN'): string {
  const value = parseFloat(amount);
  if (isNaN(value)) return amount;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

/**
 * Generate a Shopify checkout URL for a product.
 * Uses the online store URL if available, otherwise constructs one from the domain + handle.
 */
export function getShopifyProductUrl(cfg: ShopifyConfig, product: ShopifyProduct): string | null {
  if (product.online_store_url) return product.online_store_url;
  if (!cfg.store_domain || !product.handle) return null;
  const domain = cfg.store_domain.startsWith('http') ? cfg.store_domain : `https://${cfg.store_domain}`;
  return `${domain}/products/${product.handle}`;
}

/**
 * Check connection health by making a minimal API call.
 */
export async function checkShopifyConnection(cfg: ShopifyConfig): Promise<{ ok: boolean; error: string | null }> {
  if (!cfg.is_connected) return { ok: false, error: 'Not configured' };
  const query = `query { shop { name } }`;
  const { error } = await shopifyFetch(cfg, query);
  return { ok: !error, error };
}
