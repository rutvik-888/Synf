import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SITE_URL = "https://synf.bolt.host";

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date().toISOString();

  // Static pages with their priorities and change frequencies
  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/events", priority: "0.9", changefreq: "daily" },
    { path: "/about", priority: "0.8", changefreq: "monthly" },
    { path: "/people", priority: "0.8", changefreq: "weekly" },
    { path: "/jobs", priority: "0.7", changefreq: "weekly" },
    { path: "/collaborate", priority: "0.6", changefreq: "monthly" },
    { path: "/apply", priority: "0.6", changefreq: "monthly" },
    { path: "/contact", priority: "0.5", changefreq: "monthly" },
    { path: "/goods", priority: "0.6", changefreq: "weekly" },
    { path: "/pass", priority: "0.5", changefreq: "monthly" },
    { path: "/community", priority: "0.5", changefreq: "weekly" },
    { path: "/terms", priority: "0.3", changefreq: "yearly" },
    { path: "/privacy", priority: "0.3", changefreq: "yearly" },
    { path: "/copyright", priority: "0.3", changefreq: "yearly" },
  ];

  // Fetch all dynamic content in parallel
  const [events, people, jobs, goods, campaigns] = await Promise.all([
    supabase.from("events").select("slug,updated_at,is_published,status").eq("is_published", true),
    supabase.from("people").select("slug,updated_at,status").eq("status", "approved"),
    supabase.from("jobs").select("slug,updated_at,status").eq("status", "open"),
    supabase.from("goods_products").select("slug,updated_at,status").eq("status", "published"),
    supabase.from("campaigns").select("slug,updated_at,status,landing_page_visible").eq("landing_page_visible", true).in("status", ["live", "completed"]),
  ]);

  const urls: string[] = [];

  // Static pages
  for (const p of staticPages) {
    urls.push(`  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`);
  }

  // Events
  for (const e of (events.data || [])) {
    urls.push(`  <url>
    <loc>${SITE_URL}/events/${xmlEscape(e.slug)}</loc>
    <lastmod>${e.updated_at || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`);
  }

  // People
  for (const p of (people.data || [])) {
    urls.push(`  <url>
    <loc>${SITE_URL}/people</loc>
    <lastmod>${p.updated_at || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // Jobs
  for (const j of (jobs.data || [])) {
    urls.push(`  <url>
    <loc>${SITE_URL}/jobs/${xmlEscape(j.slug)}</loc>
    <lastmod>${j.updated_at || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // Goods
  for (const g of (goods.data || [])) {
    urls.push(`  <url>
    <loc>${SITE_URL}/goods/${xmlEscape(g.slug)}</loc>
    <lastmod>${g.updated_at || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  // Campaigns
  for (const c of (campaigns.data || [])) {
    urls.push(`  <url>
    <loc>${SITE_URL}/campaigns/${xmlEscape(c.slug)}</loc>
    <lastmod>${c.updated_at || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
