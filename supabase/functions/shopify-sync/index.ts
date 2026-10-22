import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfgRow } = await supabase
      .from("site_content")
      .select("data")
      .eq("slug", "shopify_config")
      .maybeSingle();

    if (!cfgRow?.data) {
      return new Response(JSON.stringify({ error: "Shopify not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = cfgRow.data as Record<string, string>;
    const domain = cfg.store_domain?.startsWith("http") ? cfg.store_domain : `https://${cfg.store_domain}`;
    const token = cfg.storefront_access_token;
    const apiVersion = cfg.api_version || "2024-10";

    if (!domain || !token) {
      return new Response(JSON.stringify({ error: "Shopify store domain or token missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = `
      query Products($limit: Int!) {
        products(first: $limit, sortKey: UPDATED_AT, reverse: true) {
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
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    price { amount currencyCode }
                    availableForSale
                    sku
                    selectedOptions { name value }
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

    const res = await fetch(`${domain}/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query, variables: { limit: 250 } }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await supabase.from("shopify_sync_log").insert({
        topic: "manual_full_sync",
        status: "error",
        message: `Shopify API returned ${res.status}: ${errText}`,
        processed_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ error: `Shopify API error: ${res.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    if (json.errors) {
      await supabase.from("shopify_sync_log").insert({
        topic: "manual_full_sync",
        status: "error",
        message: json.errors.map((e: { message: string }) => e.message).join(", "),
        processed_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ error: json.errors.map((e: { message: string }) => e.message).join(", ") }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const products = json.data?.products?.edges || [];
    let syncedCount = 0;

    for (const edge of products) {
      const n = edge.node;
      const variants = (n.variants?.edges || []).map((e: { node: Record<string, unknown> }) => ({
        id: e.node.id,
        title: e.node.title,
        price: e.node.price,
        available: e.node.availableForSale,
        sku: e.node.sku || null,
        selectedOptions: e.node.selectedOptions || [],
      }));

      const images = (n.images?.edges || []).map((e: { node: { url: string; altText: string } }) => ({
        url: e.node.url,
        alt: e.node.altText || "",
      }));

      const { error } = await supabase.from("shopify_products").upsert({
        shopify_gid: n.id,
        handle: n.handle,
        title: n.title,
        description: n.description || "",
        product_type: n.productType || "",
        vendor: n.vendor || "",
        tags: n.tags || [],
        featured_image: n.featuredImage ? { url: n.featuredImage.url, alt: n.featuredImage.altText || "" } : null,
        images,
        variants,
        available: n.availableForSale,
        price_range: { min: n.priceRange?.minVariantPrice, max: n.priceRange?.maxVariantPrice },
        online_store_url: n.onlineStoreUrl,
        status: "published",
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "shopify_gid" });

      if (!error) syncedCount++;
    }

    await supabase.from("site_content").update({
      data: { ...cfg, last_synced_at: new Date().toISOString(), last_error: null },
    }).eq("slug", "shopify_config");

    await supabase.from("shopify_sync_log").insert({
      topic: "manual_full_sync",
      status: "success",
      message: `Synced ${syncedCount} products from Shopify`,
      processed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ synced: syncedCount, total: products.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase.from("shopify_sync_log").insert({
      topic: "manual_full_sync",
      status: "error",
      message,
      processed_at: new Date().toISOString(),
    });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
