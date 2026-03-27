import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://tekstilas.com";
const PAGE_SIZE = 1000;

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

function buildUrlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function wrapUrlset(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

/** Paginated fetch — pulls all rows beyond the 1000 default limit */
async function fetchAll<T>(query: any): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

const xmlHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const segment = url.searchParams.get("segment");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split("T")[0];

    // Sitemap Index — returns list of sub-sitemaps
    if (!segment) {
      const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml?segment=statik</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml?segment=firmalar</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml?segment=urunler</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml?segment=ihaleler</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
      return new Response(sitemapIndex, { headers: xmlHeaders });
    }

    // Static pages segment
    if (segment === "statik") {
      const urls = STATIC_PAGES.map(p =>
        buildUrlEntry(`${BASE_URL}${p.path}`, today, p.changefreq, p.priority)
      );
      return new Response(wrapUrlset(urls), { headers: xmlHeaders });
    }

    // Firmalar segment (paginated)
    if (segment === "firmalar") {
      const data = await fetchAll(
        sb.from("firmalar").select("slug, updated_at").not("slug", "is", null)
      );
      const urls = data.map((f: any) =>
        buildUrlEntry(`${BASE_URL}/${escapeXml(f.slug)}`, formatDate(f.updated_at), "weekly", "0.8")
      );
      return new Response(wrapUrlset(urls), { headers: xmlHeaders });
    }

    // Urunler segment (paginated)
    if (segment === "urunler") {
      const data = await fetchAll(
        sb.from("urunler").select("slug, updated_at, durum").eq("durum", "aktif").not("slug", "is", null)
      );
      const urls = data.map((u: any) =>
        buildUrlEntry(`${BASE_URL}/urunler/${escapeXml(u.slug)}`, formatDate(u.updated_at), "weekly", "0.8")
      );
      return new Response(wrapUrlset(urls), { headers: xmlHeaders });
    }

    // Ihaleler segment (paginated, includes devam_ediyor + tamamlandi)
    if (segment === "ihaleler") {
      const data = await fetchAll(
        sb.from("ihaleler").select("slug, updated_at, durum").in("durum", ["devam_ediyor", "tamamlandi"]).not("slug", "is", null)
      );
      const urls = data.map((i: any) =>
        buildUrlEntry(
          `${BASE_URL}/ihaleler/${escapeXml(i.slug)}`,
          formatDate(i.updated_at),
          i.durum === "devam_ediyor" ? "weekly" : "monthly",
          i.durum === "devam_ediyor" ? "0.8" : "0.5"
        )
      );
      return new Response(wrapUrlset(urls), { headers: xmlHeaders });
    }

    // Unknown segment — return all in one (backward compat, paginated)
    const [firmaData, ihaleData, urunData] = await Promise.all([
      fetchAll(sb.from("firmalar").select("slug, updated_at").not("slug", "is", null)),
      fetchAll(sb.from("ihaleler").select("slug, updated_at, durum").in("durum", ["devam_ediyor", "tamamlandi"]).not("slug", "is", null)),
      fetchAll(sb.from("urunler").select("slug, updated_at, durum").eq("durum", "aktif").not("slug", "is", null)),
    ]);

    let urls = STATIC_PAGES.map(p =>
      buildUrlEntry(`${BASE_URL}${p.path}`, today, p.changefreq, p.priority)
    );

    for (const f of firmaData as any[]) {
      urls.push(buildUrlEntry(`${BASE_URL}/${escapeXml(f.slug)}`, formatDate(f.updated_at), "weekly", "0.8"));
    }
    for (const i of ihaleData as any[]) {
      urls.push(buildUrlEntry(
        `${BASE_URL}/ihaleler/${escapeXml(i.slug)}`,
        formatDate(i.updated_at),
        i.durum === "devam_ediyor" ? "weekly" : "monthly",
        i.durum === "devam_ediyor" ? "0.8" : "0.5"
      ));
    }
    for (const u of urunData as any[]) {
      urls.push(buildUrlEntry(`${BASE_URL}/urunler/${escapeXml(u.slug)}`, formatDate(u.updated_at), "weekly", "0.8"));
    }

    return new Response(wrapUrlset(urls), { headers: xmlHeaders });
  } catch (e) {
    console.error("Sitemap error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
});
