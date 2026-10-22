import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shopify-Topic, X-Shopify-Hmac-Sha256, X-Shopify-Webhook-Id, X-Shopify-Shop-Domain",
};

async function verifyHmac(rawBody: string, hmacHeader: string, secret: string): Promise<boolean> {
  const key = new TextEncoder().encode(secret);
  const data = new TextEncoder().encode(rawBody);
  const crypto = globalThis.crypto;
  try {
    const keyObj = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", keyObj, data);
    const digest = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return digest === hmacHeader;
  } catch {
    return false;
  }
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SHOPIFY_WEBHOOK_SECRET = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");

async function logSync(topic: string, resourceId: string, status: string, message: string) {
  await supabase.from("shopify_sync_log").insert({
    topic,
    resource_id: resourceId,
    status,
    message,
    processed_at: new Date().toISOString(),
  });
}

async function upsertProduct(p: Record<string, unknown>) {
  const shopifyGid = `gid://shopify/Product/${p.id}`;
  const rawVariants = (p.variants as Array<Record<string, unknown>>) || [];
  const variants = rawVariants.map((v) => ({
    id: `gid://shopify/ProductVariant/${v.id}`,
    title: v.title as string,
    price: { amount: String(v.price || "0"), currencyCode: "INR" },
    available: v.inventory_policy !== "deny" || Number(v.inventory_quantity || 0) > 0,
    sku: v.sku || null,
    option1: v.option1 || null,
    option2: v.option2 || null,
    option3: v.option3 || null,
  }));

  const rawImages = (p.images as Array<Record<string, unknown>>) || [];
  const images = rawImages.map((img) => ({
    url: img.src as string,
    alt: (img.alt as string) || "",
  }));

  const featuredImage = images[0] || null;
  const minPrice = variants.reduce((min, v) => Math.min(min, parseFloat(v.price.amount)), Infinity);
  const maxPrice = variants.reduce((max, v) => Math.max(max, parseFloat(v.price.amount)), 0);
  const priceRange = {
    min: { amount: String(isFinite(minPrice) ? minPrice : 0), currencyCode: "INR" },
    max: { amount: String(maxPrice), currencyCode: "INR" },
  };

  const status = p.status === "active" ? "published" : "archived";

  const { error } = await supabase.from("shopify_products").upsert({
    shopify_gid: shopifyGid,
    handle: p.handle as string,
    title: p.title as string,
    description: (p.body_html as string) || "",
    product_type: (p.product_type as string) || "",
    vendor: (p.vendor as string) || "",
    tags: Array.isArray(p.tags) ? p.tags : String(p.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
    featured_image: featuredImage,
    images,
    variants,
    available: status === "published",
    price_range: priceRange,
    online_store_url: null,
    status,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "shopify_gid" });

  if (error) throw new Error(`Upsert failed: ${error.message}`);
}

async function deleteProduct(shopifyId: string) {
  const gid = `gid://shopify/Product/${shopifyId}`;
  const { error } = await supabase.from("shopify_products").delete().eq("shopify_gid", gid);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

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
    const rawBody = await req.text();
    const topic = req.headers.get("X-Shopify-Topic") || "";
    const hmacHeader = req.headers.get("X-Shopify-Hmac-Sha256") || "";
    const webhookId = req.headers.get("X-Shopify-Webhook-Id") || "";

    if (SHOPIFY_WEBHOOK_SECRET) {
      const valid = await verifyHmac(rawBody, hmacHeader, SHOPIFY_WEBHOOK_SECRET);
      if (!valid) {
        await logSync(topic, webhookId, "error", "Invalid HMAC signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = JSON.parse(rawBody);
    const productId = body.id?.toString() || "";

    if (topic === "products/create" || topic === "products/update") {
      await upsertProduct(body);
      await logSync(topic, productId, "success", `Product ${body.title} synced`);
    } else if (topic === "products/delete") {
      await deleteProduct(productId);
      await logSync(topic, productId, "success", "Product deleted");
    } else {
      await logSync(topic, productId || webhookId, "success", `Topic ${topic} received`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logSync("unknown", "", "error", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
