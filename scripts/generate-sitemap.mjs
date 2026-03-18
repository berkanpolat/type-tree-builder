import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://tekstilas.com";
const TODAY = new Date().toISOString().split("T")[0];
const PAGE_SIZE = 1000;

const STATIC_PAGES = [
  "/",
  "/hakkimizda",
  "/iletisim",
  "/sss",
  "/ihaleler",
  "/firmalar",
  "/tekpazar",
  "/tekihale-tanitim",
  "/tekpazar-tanitim",
  "/gizlilik-kosullari",
  "/kullanim-kosullari",
  "/kvkk-aydinlatma",
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(value) {
  if (!value) return TODAY;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? TODAY : date.toISOString().split("T")[0];
}

function buildUrl(loc, lastmod, changefreq) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    "  </url>",
  ].join("\n");
}

async function fetchAllRows(queryFactory) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryFactory().range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function generateSitemap() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const [firmalar, ihaleler, urunler] = await Promise.all([
    fetchAllRows(() =>
      supabase
        .from("firmalar")
        .select("slug, updated_at")
        .eq("onay_durumu", "onaylandi")
        .not("slug", "is", null)
        .order("updated_at", { ascending: false })
    ),
    fetchAllRows(() =>
      supabase
        .from("ihaleler")
        .select("slug, updated_at")
        .eq("durum", "devam_ediyor")
        .not("slug", "is", null)
        .order("updated_at", { ascending: false })
    ),
    fetchAllRows(() =>
      supabase
        .from("urunler")
        .select("slug, updated_at")
        .eq("durum", "aktif")
        .not("slug", "is", null)
        .order("updated_at", { ascending: false })
    ),
  ]);

  const entries = [
    ...STATIC_PAGES.map((path) => buildUrl(`${BASE_URL}${path}`, TODAY, "monthly")),
    ...firmalar.map(({ slug, updated_at }) => buildUrl(`${BASE_URL}/${slug}`, formatDate(updated_at), "weekly")),
    ...ihaleler.map(({ slug, updated_at }) => buildUrl(`${BASE_URL}/ihaleler/${slug}`, formatDate(updated_at), "weekly")),
    ...urunler.map(({ slug, updated_at }) => buildUrl(`${BASE_URL}/urunler/${slug}`, formatDate(updated_at), "weekly")),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.join("\n"),
    '</urlset>',
    '',
  ].join("\n");

  const outputPath = resolve(__dirname, "../public/sitemap.xml");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, xml, "utf8");

  console.log(`Sitemap generated: ${entries.length} URLs`);
}

generateSitemap().catch((error) => {
  console.error("Failed to generate sitemap:", error);
  process.exit(1);
});
