import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://tekstilas.com";

const STATIC_PAGES = [
  { path: "/", changefreq: "monthly", priority: "1.0" },
  { path: "/hakkimizda", changefreq: "monthly", priority: "0.7" },
  { path: "/iletisim", changefreq: "monthly", priority: "0.7" },
  { path: "/sss", changefreq: "monthly", priority: "0.6" },
  { path: "/ihaleler", changefreq: "weekly", priority: "0.9" },
  { path: "/firmalar", changefreq: "weekly", priority: "0.9" },
  { path: "/tekpazar", changefreq: "weekly", priority: "0.9" },
  { path: "/tekihale-tanitim", changefreq: "monthly", priority: "0.7" },
  { path: "/tekpazar-tanitim", changefreq: "monthly", priority: "0.7" },
  { path: "/gizlilik-kosullari", changefreq: "monthly", priority: "0.3" },
  { path: "/kullanim-kosullari", changefreq: "monthly", priority: "0.3" },
  { path: "/kvkk-aydinlatma", changefreq: "monthly", priority: "0.3" },
];

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function formatDate(d: string): string {
  return d ? new Date(d).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
}

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const [firmaRes, ihaleRes, urunRes] = await Promise.all([
      sb.from("firmalar").select("slug, updated_at").not("slug", "is", null),
      sb.from("ihaleler").select("slug, updated_at, durum").eq("durum", "devam_ediyor").not("slug", "is", null),
      sb.from("urunler").select("slug, updated_at, durum").eq("durum", "aktif").not("slug", "is", null),
    ]);

    const today = new Date().toISOString().split("T")[0];

    let urls = STATIC_PAGES.map(p =>
      `  <url>\n    <loc>${BASE_URL}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    );

    for (const f of firmaRes.data || []) {
      urls.push(`  <url>\n    <loc>${BASE_URL}/${escapeXml(f.slug)}</loc>\n    <lastmod>${formatDate(f.updated_at)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
    }

    for (const i of ihaleRes.data || []) {
      urls.push(`  <url>\n    <loc>${BASE_URL}/ihaleler/${escapeXml(i.slug)}</loc>\n    <lastmod>${formatDate(i.updated_at)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
    }

    for (const u of urunRes.data || []) {
      urls.push(`  <url>\n    <loc>${BASE_URL}/urunler/${escapeXml(u.slug)}</loc>\n    <lastmod>${formatDate(u.updated_at)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("Sitemap error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
});
