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

      const title = dynamicTitle || meta.title || fallbackTitle;
      const description = dynamicDescription || meta.description || fallbackDescription || "";
      const ogTitle = meta.og_title || title;
      const ogDesc = meta.og_description || description;
      const ogImage = dynamicOgImage || meta.og_image || "";

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

      // Canonical
      if (meta.canonical_url) {
        let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.setAttribute("rel", "canonical");
          document.head.appendChild(link);
        }
        link.href = meta.canonical_url;
      }

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
