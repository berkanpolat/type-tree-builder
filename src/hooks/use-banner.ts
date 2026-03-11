import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BannerData {
  gorsel_url: string | null;
  link_url: string | null;
  aktif: boolean;
}

const bannerCache: Record<string, BannerData | null> = {};

export function useBanner(slug: string, fallbackUrl?: string) {
  const [url, setUrl] = useState<string | null>(fallbackUrl || null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bannerCache[slug] !== undefined) {
      const cached = bannerCache[slug];
      if (cached?.gorsel_url && cached.aktif) {
        setUrl(cached.gorsel_url);
        setLinkUrl(cached.link_url);
      } else {
        setUrl(fallbackUrl || null);
      }
      setLoading(false);
      return;
    }

    supabase
      .from("banners")
      .select("gorsel_url, link_url, aktif")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        bannerCache[slug] = data as BannerData | null;
        if (data?.gorsel_url && data.aktif) {
          setUrl(data.gorsel_url);
          setLinkUrl(data.link_url);
        } else {
          setUrl(fallbackUrl || null);
        }
        setLoading(false);
      });
  }, [slug, fallbackUrl]);

  return { url, linkUrl, loading };
}

// Invalidate cache after admin update
export function invalidateBannerCache(slug?: string) {
  if (slug) {
    delete bannerCache[slug];
  } else {
    Object.keys(bannerCache).forEach((k) => delete bannerCache[k]);
  }
}
