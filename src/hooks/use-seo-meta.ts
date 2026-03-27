import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SeoMetaOptions {
  /** The route slug to look up, e.g. "/" or "/tekpazar" */
  slug: string;
  /** Fallback title if no DB entry found */
  fallbackTitle?: string;
  /** Fallback description */
  fallbackDescription?: string;
  /** For dynamic pages: override title from data */
  dynamicTitle?: string;
  /** For dynamic pages: override description from data */
  dynamicDescription?: string;
  /** For dynamic pages: override og image */
  dynamicOgImage?: string;
}

const BRAND_SUFFIX = " | Tekstil A.Ş.";
const MAX_TITLE_LEN = 60;

/**
 * Smart truncate: keeps brand suffix visible in SERPs.
 * If title already ends with the suffix it's left as-is.
 */
function truncateTitle(raw: string): string {
  if (!raw) return raw;
  // Already includes brand suffix
  if (raw.endsWith(BRAND_SUFFIX)) {
    if (raw.length <= MAX_TITLE_LEN) return raw;
    // Trim the content part, keep suffix
    const maxContent = MAX_TITLE_LEN - BRAND_SUFFIX.length;
    return raw.slice(0, maxContent).trimEnd() + "…" + BRAND_SUFFIX;
  }
  // No suffix yet — add it
  const withSuffix = raw + BRAND_SUFFIX;
  if (withSuffix.length <= MAX_TITLE_LEN) return withSuffix;
  const maxContent = MAX_TITLE_LEN - BRAND_SUFFIX.length;
  return raw.slice(0, maxContent).trimEnd() + "…" + BRAND_SUFFIX;
}

export function useSeoMeta({
  slug,
  fallbackTitle = "Tekstil A.Ş.",
  fallbackDescription,
  dynamicTitle,
  dynamicDescription,
  dynamicOgImage,
}: SeoMetaOptions) {
  useEffect(() => {
    let cancelled = false;

    const apply = (meta: {
      title?: string | null;
      description?: string | null;
      keywords?: string | null;
      og_title?: string | null;
      og_description?: string | null;
      og_image?: string | null;
      canonical_url?: string | null;
      robots?: string | null;
      json_ld?: any;
    }) => {
      if (cancelled) return;

      const rawTitle = dynamicTitle || meta.title || fallbackTitle;
      const title = truncateTitle(rawTitle);
      const description = dynamicDescription || meta.description || fallbackDescription || "";
      const ogTitle = meta.og_title || title;
      const ogDesc = meta.og_description || description;
      const ogImage = dynamicOgImage || meta.og_image || "https://tekstilas.com/images/og-default.jpg";

      document.title = title;

      const setMeta = (name: string, content: string, attr = "name") => {
        if (!content) return;
        let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute(attr, name);
          document.head.appendChild(el);
        }
        el.setAttribute("content", content);
      };

      setMeta("description", description);
      if (meta.keywords) setMeta("keywords", meta.keywords);
      if (meta.robots) setMeta("robots", meta.robots);

      // Open Graph
      setMeta("og:title", ogTitle, "property");
      setMeta("og:description", ogDesc, "property");
      if (ogImage) setMeta("og:image", ogImage, "property");
      setMeta("og:type", "website", "property");
      setMeta("og:site_name", "Tekstil A.Ş.", "property");

      // Twitter
      setMeta("twitter:card", "summary_large_image");
      setMeta("twitter:title", ogTitle);
      setMeta("twitter:description", ogDesc);
      if (ogImage) setMeta("twitter:image", ogImage);

      // Canonical — use DB value if set, otherwise auto-generate
      const canonicalUrl = meta.canonical_url || (() => {
        const path = window.location.pathname.replace(/\/+$/, "") || "/";
        return `https://tekstilas.com${path}`;
      })();
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.href = canonicalUrl;

      // og:url — match canonical
      setMeta("og:url", canonicalUrl, "property");

      // JSON-LD
      if (meta.json_ld) {
        let script = document.getElementById("seo-json-ld") as HTMLScriptElement | null;
        if (!script) {
          script = document.createElement("script");
          script.id = "seo-json-ld";
          script.type = "application/ld+json";
          document.head.appendChild(script);
        }
        script.textContent = typeof meta.json_ld === "string" ? meta.json_ld : JSON.stringify(meta.json_ld);
      }
    };

    // Try to fetch from DB
    (supabase as any)
      .from("seo_meta")
      .select("*")
      .eq("sayfa_slug", slug)
      .eq("aktif", true)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          apply(data);
        } else {
          // Apply fallbacks
          apply({});
        }
      })
      .catch(() => {
        apply({});
      });

    return () => {
      cancelled = true;
    };
  }, [slug, fallbackTitle, fallbackDescription, dynamicTitle, dynamicDescription, dynamicOgImage]);
}
